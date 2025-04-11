"""
聊天API路由
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
import asyncio
import logging
import time
import json
from typing import List, Dict, Any, Optional

from app.utils.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse, MedicalRecordCreate, MedicalRecordUpdate, MedicalRecordResponse
from app.models.chat import ChatMessage, ChatSession, MedicalRecord, UserFocus
from app.services.cache_service import SharedCache

from app.api.agents.intent_agent import IntentAgent
from app.api.agents.medical_info_agent import MedicalInfoAgent
from app.api.agents.medical_record_agent import MedicalRecordAgent
from app.api.agents.response_agent import ResponseAgent
from app.api.agents.focus_agent import FocusAgent

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# 创建全局共享缓存
shared_cache = SharedCache()

# 初始化各个Agent
intent_agent = IntentAgent()
medical_info_agent = MedicalInfoAgent()
medical_record_agent = MedicalRecordAgent()
response_agent = ResponseAgent()
focus_agent = FocusAgent()

# WebSocket连接管理器
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: int):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: int):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def send_json(self, message: Dict[str, Any], session_id: int):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket, sessionId: int = Query(...), userId: int = Query(...), db: Session = Depends(get_db)):
    """
    通过WebSocket进行聊天，支持流式传输响应
    """
    try:
        # 连接WebSocket
        await manager.connect(websocket, sessionId)
        
        # 验证会话存在
        session = db.query(ChatSession).filter(ChatSession.id == sessionId).first()
        if not session:
            await websocket.send_json({"type": "error", "message": "聊天会话不存在"})
            await websocket.close()
            return
        
        # 验证用户ID与会话ID的关联性
        if session.user_id != userId:
            await websocket.send_json({"type": "error", "message": "无权访问此会话，用户ID与会话不匹配"})
            await websocket.close()
            return
        
        # 等待用户消息
        while True:
            try:
                # 接收消息
                data = await websocket.receive_text()
                message_data = json.loads(data)
                user_message = message_data.get("message", "")
                
                if not user_message.strip():
                    await websocket.send_json({"type": "error", "message": "消息不能为空"})
                    continue
                
                # 开始处理聊天
                await process_chat_message(websocket, sessionId, userId, user_message, db)
                
            except WebSocketDisconnect:
                manager.disconnect(websocket, sessionId)
                break
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "无效的JSON格式"})
            except Exception as e:
                logger.error(f"WebSocket处理错误: {str(e)}")
                await websocket.send_json({"type": "error", "message": f"处理消息时发生错误: {str(e)}"})
    
    except Exception as e:
        logger.error(f"WebSocket连接错误: {str(e)}")
        try:
            manager.disconnect(websocket, sessionId)
            await websocket.close()
        except:
            pass

async def process_chat_message(websocket: WebSocket, session_id: int, user_id: int, user_message: str, db: Session):
    """
    处理WebSocket聊天消息并发送流式响应
    """
    start_time = time.time()
    
    try:
        # 获取聊天历史
        chat_history = shared_cache.get_chat_history(session_id, db=db)
        
        # 获取医疗记录
        medical_record = shared_cache.get_medical_record(session_id, db=db)
        print(f"缓存中的medical_record！！！！！{medical_record}")
        
        # 获取用户关注点
        focus_points = shared_cache.get_user_focus(session_id, db=db)

        # 记录用户消息到数据库
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=user_message
        )
        db.add(user_msg)
        db.commit()
        db.refresh(user_msg)
        
        # 更新缓存中的聊天历史
        shared_cache.add_message_to_history(session_id, "user", user_message)
        
        # 发送初始状态
        await websocket.send_json({
            "type": "status",
            "message": "开始处理聊天请求...",
            "progress": {
                "intent": "分析中...",
                "medical_info": "分析中...",
                "medical_record": "分析中...",
                "focus": "分析中..."
            }
        })
        
        # 使用意图Agent处理 - 异步任务
        intent_task = asyncio.create_task(
            intent_agent.process(
                session_id=session_id,
                message_id=user_msg.id,
                user_message=user_message,
                chat_history=chat_history,
                medical_record=medical_record
            )
        )
        
        # 使用医疗信息Agent处理 - 异步任务
        medical_info_task = asyncio.create_task(
            medical_info_agent.process(
                session_id=session_id,
                message_id=user_msg.id,
                user_message=user_message,
                chat_history=chat_history,
                medical_record=medical_record
            )
        )
        
        # 使用病历Agent处理 - 异步任务
        medical_record_task = asyncio.create_task(
            medical_record_agent.process(
                session_id=session_id,
                message_id=user_msg.id,
                user_message=user_message,
                chat_history=chat_history,
                medical_record=medical_record
            )
        )
        
        # 使用关注点Agent处理 - 异步任务
        focus_task = asyncio.create_task(
            focus_agent.process(
                session_id=session_id,
                message_id=user_msg.id,
                user_message=user_message,
                chat_history=chat_history,
                focus_points=focus_points
            )
        )
        
        # 创建任务完成标志
        intent_done = asyncio.Event()
        medical_info_done = asyncio.Event()
        medical_record_done = asyncio.Event()
        focus_done = asyncio.Event()
        
        # 设置回调函数
        intent_result = {}
        medical_info_result = {}
        medical_record_result = {}
        focus_result = {}
        
        def intent_callback(task):
            nonlocal intent_result
            intent_result = task.result()
            intent_done.set()
        
        def medical_info_callback(task):
            nonlocal medical_info_result
            medical_info_result = task.result()
            medical_info_done.set()
        
        def medical_record_callback(task):
            nonlocal medical_record_result
            medical_record_result = task.result()
            medical_record_done.set()
            
        def focus_callback(task):
            nonlocal focus_result
            focus_result = task.result()
            focus_done.set()
        
        # 添加回调
        intent_task.add_done_callback(intent_callback)
        medical_info_task.add_done_callback(medical_info_callback)
        medical_record_task.add_done_callback(medical_record_callback)
        focus_task.add_done_callback(focus_callback)
        
        # 等待任务完成并发送进度更新
        while not (intent_done.is_set() and medical_info_done.is_set() and medical_record_done.is_set() and focus_done.is_set()):
            # 构建进度信息
            progress = {
                "intent": "analysing..." if not intent_done.is_set() else "Done",
                "medical_info": "analysing..." if not medical_info_done.is_set() else "Done",
                "medical_record": "analysing..." if not medical_record_done.is_set() else "Done",
                "focus": "analysing..." if not focus_done.is_set() else "Done"
            }
            
            # 添加已完成的结果
            if intent_done.is_set():
                progress["intent_result"] = intent_result
            
            if medical_info_done.is_set():
                progress["medical_info_result"] = medical_info_result
            
            if medical_record_done.is_set():
                progress["medical_record_result"] = medical_record_result
                
            if focus_done.is_set():
                progress["focus_result"] = focus_result
            
            # 发送进度更新
            await websocket.send_json({
                "type": "progress",
                "progress": progress
            })
            
            # 等待一小段时间
            await asyncio.sleep(0.1)
        
        # 发送最终进度更新，确保所有模型状态都显示为"已完成"
        final_progress = {
            "intent": "Done",
            "medical_info": "Done",
            "medical_record": "Done",
            "focus": "Done",
            "intent_result": intent_result,
            "medical_info_result": medical_info_result,
            "medical_record_result": medical_record_result,
            "focus_result": focus_result
        }
        
        await websocket.send_json({
            "type": "progress",
            "progress": final_progress
        })
        
        # 所有Agent任务已完成
        logger.info("four Agents all Done")

        # 存储Agent结果到缓存
        shared_cache.set_agent_result(session_id, user_msg.id, "intent_agent", intent_result)
        shared_cache.set_agent_result(session_id, user_msg.id, "medical_info_agent", medical_info_result)
        
        # 更新缓存中的医疗记录
        updated_medical_record = medical_record_result.get("updated_record", medical_record)
        shared_cache.set_agent_result(session_id, user_msg.id, "medical_record_agent", updated_medical_record)
        shared_cache.update_medical_record(session_id, updated_medical_record)
        
        # 更新缓存中的用户关注点
        updated_focus_points = focus_result.get("focus_points", focus_points)
        shared_cache.set_agent_result(session_id, user_msg.id, "focus_agent", focus_result)
        shared_cache.update_user_focus(session_id, updated_focus_points)
        
        # 更新用户关注点到数据库
        user_focus_db = db.query(UserFocus).filter(UserFocus.session_id == session_id).first()
        if user_focus_db:
            # 确保字典被正确处理为JSON格式
            try:
                user_focus_db.focus_content = updated_focus_points
                db.commit()
            except Exception as e:
                logger.error(f"更新用户关注点到数据库失败: {str(e)}")
                # 尝试将字典转换为JSON字符串再赋值
                user_focus_db.focus_content = json.dumps(updated_focus_points)
                db.commit()
        else:
            try:
                new_focus = UserFocus(
                    session_id=session_id,
                    focus_content=updated_focus_points
                )
                db.add(new_focus)
                db.commit()
            except Exception as e:
                logger.error(f"新建用户关注点失败: {str(e)}")
                # 尝试将字典转换为JSON字符串再赋值
                new_focus = UserFocus(
                    session_id=session_id,
                    focus_content=json.dumps(updated_focus_points)
                )
                db.add(new_focus)
                db.commit()
        
        # 使用响应Agent生成最终回复
        await websocket.send_json({
            "type": "status",
            "message": "generating..."
        })
        
        response_result = await response_agent.process(
            session_id=session_id,
            message_id=user_msg.id,
            user_message=user_message,
            chat_history=chat_history,
            medical_record=updated_medical_record,
            intent_result=intent_result,
            medical_info_result=medical_info_result
        )
        
        # 更新聊天消息中的关键信息
        user_msg.intent = intent_result.get("intent", "unkown Intent")
        keywords = medical_info_result.get("keywords", [])
        user_msg.keywords = ",".join(keywords) if keywords else ""
        db.commit()
        
        # 记录助手回复到数据库
        assistant_message = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=response_result.get("response", "sorry, I can't answer your question"),
            follow_up_questions=", ".join(response_result.get("follow_up_questions", [])),
            medical_info=json.dumps(medical_info_result.get("raw_results", ""), ensure_ascii=False) if isinstance(medical_info_result.get("raw_results"), (dict, list)) else str(medical_info_result.get("raw_results", ""))
        )
        db.add(assistant_message)
        db.commit()
        
        # 更新缓存中的聊天历史
        shared_cache.add_message_to_history(session_id, "assistant", response_result.get("response", ""))
        
        # 更新MedicalRecord表中的记录
        medical_record_db = db.query(MedicalRecord).filter(MedicalRecord.session_id == session_id).first()
        if medical_record_db:
            medical_record_db.record_content = updated_medical_record
            db.commit()
        else:
            new_record = MedicalRecord(
                session_id=session_id,
                record_content=updated_medical_record
            )
            db.add(new_record)
            db.commit()
        
        end_time = time.time()
        logger.info(f"Chat processing completed in {end_time - start_time:.2f} seconds")
        
        # 发送最终响应
        final_response = {
            "type": "final",
            "message": response_result.get("response", ""),
            "follow_up_questions": response_result.get("follow_up_questions", []),
            "medical_record": updated_medical_record if updated_medical_record else None,
            "medical_info": json.dumps(medical_info_result.get("raw_results", ""), ensure_ascii=False) if isinstance(medical_info_result.get("raw_results"), (dict, list)) else str(medical_info_result.get("raw_results", "")),
            "keywords": medical_info_result.get("keywords", []),
            "focus_points": updated_focus_points,
            "current_focus": focus_result.get("current_focus", "")
        }
        
        await websocket.send_json(final_response)
        
    except Exception as e:
        logger.error(f"处理聊天消息时发生错误: {str(e)}")
        await websocket.send_json({
            "type": "error",
            "message": f"处理聊天请求时发生错误: {str(e)}"
        })

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    处理聊天请求
    缓存内容：聊天历史
    缓存内容：医疗记录
    缓存内容：三个agent的结果
    
    Args:
        request: 聊天请求信息
        db: 数据库会话
    
    Returns:
        聊天响应
    """
    try:
        start_time = time.time()
        
        # 验证会话存在
        session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="聊天会话不存在")
        
        # 验证用户ID与会话ID的关联性
        if session.user_id != request.user_id:
            raise HTTPException(status_code=403, detail="无权访问此会话，用户ID与会话不匹配")
        
        # 获取聊天历史
        chat_history = shared_cache.get_chat_history(request.session_id, db=db)
        
        # 获取医疗记录
        medical_record = shared_cache.get_medical_record(request.session_id, db=db)
        
        # 获取用户关注点
        focus_points = shared_cache.get_user_focus(request.session_id, db=db)
        
        # 记录用户消息到数据库
        user_message = ChatMessage(
            session_id=request.session_id,
            role="user",
            content=request.message
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        
        # 更新缓存中的聊天历史
        shared_cache.add_message_to_history(request.session_id, "user", request.message)
        
        # 使用每个Agent处理
        # 1. 异步启动所有Agent
        intent_task = asyncio.create_task(
            intent_agent.process(
                session_id=request.session_id,
                message_id=user_message.id,
                user_message=request.message,
                chat_history=chat_history,
                medical_record=medical_record
            )
        )
        
        medical_info_task = asyncio.create_task(
            medical_info_agent.process(
                session_id=request.session_id,
                message_id=user_message.id,
                user_message=request.message,
                chat_history=chat_history,
                medical_record=medical_record
            )
        )
        
        medical_record_task = asyncio.create_task(
            medical_record_agent.process(
                session_id=request.session_id,
                message_id=user_message.id,
                user_message=request.message,
                chat_history=chat_history,
                medical_record=medical_record
            )
        )
        
        focus_task = asyncio.create_task(
            focus_agent.process(
                session_id=request.session_id,
                message_id=user_message.id,
                user_message=request.message,
                chat_history=chat_history,
                focus_points=focus_points
            )
        )
        
        # 2. 等待所有Agent完成
        intent_result, medical_info_result, medical_record_result, focus_result = await asyncio.gather(
            intent_task, medical_info_task, medical_record_task, focus_task
        )
        logger.info("four Agent all done")
        
        # 存储Agent结果到缓存
        shared_cache.set_agent_result(request.session_id, user_message.id, "intent_agent", intent_result)
        shared_cache.set_agent_result(request.session_id, user_message.id, "medical_info_agent", medical_info_result)
        shared_cache.set_agent_result(request.session_id, user_message.id, "medical_record_agent", medical_record_result)
        shared_cache.set_agent_result(request.session_id, user_message.id, "focus_agent", focus_result)
        
        # 更新缓存中的医疗记录
        updated_medical_record = medical_record_result.get("updated_record", medical_record)
        shared_cache.update_medical_record(request.session_id, updated_medical_record)
        
        # 更新缓存中的用户关注点
        updated_focus_points = focus_result.get("focus_points", focus_points)
        shared_cache.update_user_focus(request.session_id, updated_focus_points)
        
        # 更新用户关注点到数据库
        user_focus_db = db.query(UserFocus).filter(UserFocus.session_id == request.session_id).first()
        if user_focus_db:
            # 确保字典被正确处理为JSON格式
            try:
                user_focus_db.focus_content = updated_focus_points
                db.commit()
            except Exception as e:
                logger.error(f"更新用户关注点到数据库失败: {str(e)}")
                # 尝试将字典转换为JSON字符串再赋值
                user_focus_db.focus_content = json.dumps(updated_focus_points)
                db.commit()
        else:
            try:
                new_focus = UserFocus(
                    session_id=request.session_id,
                    focus_content=updated_focus_points
                )
                db.add(new_focus)
                db.commit()
            except Exception as e:
                logger.error(f"新建用户关注点失败: {str(e)}")
                # 尝试将字典转换为JSON字符串再赋值
                new_focus = UserFocus(
                    session_id=request.session_id,
                    focus_content=json.dumps(updated_focus_points)
                )
                db.add(new_focus)
                db.commit()
        
        # 3. 使用响应Agent生成最终回复
        response_result = await response_agent.process(
            session_id=request.session_id,
            message_id=user_message.id,
            user_message=request.message,
            chat_history=chat_history,
            medical_record=updated_medical_record,
            intent_result=intent_result,
            medical_info_result=medical_info_result
        )
        
        # 更新聊天消息中的关键信息
        user_message.intent = intent_result.get("intent", "unknown Intent")
        keywords = medical_info_result.get("keywords", [])
        user_message.keywords = ",".join(keywords) if keywords else ""
        db.commit()
        
        # 记录助手回复到数据库
        assistant_message = ChatMessage(
            session_id=request.session_id,
            role="assistant",
            content=response_result.get("response", "Sorry,I can't answer your question"),
            follow_up_questions=", ".join(response_result.get("follow_up_questions", [])),
            medical_info=json.dumps(medical_info_result.get("raw_results", ""), ensure_ascii=False) if isinstance(medical_info_result.get("raw_results"), (dict, list)) else str(medical_info_result.get("raw_results", ""))
        )
        db.add(assistant_message)
        db.commit()
        
        # 更新缓存中的聊天历史
        shared_cache.add_message_to_history(request.session_id, "assistant", response_result.get("response", ""))
        
        # 更新MedicalRecord表中的记录
        medical_record_db = db.query(MedicalRecord).filter(MedicalRecord.session_id == request.session_id).first()
        if medical_record_db:
            medical_record_db.record_content = updated_medical_record
            db.commit()
        else:
            new_record = MedicalRecord(
                session_id=request.session_id,
                record_content=updated_medical_record
            )
            db.add(new_record)
            db.commit()
        
        end_time = time.time()
        logger.info(f"Chat processing completed in {end_time - start_time:.2f} seconds")
        
        # 返回响应
        return ChatResponse(
            message=response_result.get("response", ""),
            follow_up_questions=response_result.get("follow_up_questions", []),
            medical_record=updated_medical_record if updated_medical_record else None,
            medical_info=json.dumps(medical_info_result.get("raw_results", ""), ensure_ascii=False) if isinstance(medical_info_result.get("raw_results"), (dict, list)) else str(medical_info_result.get("raw_results", "")),
            keywords=medical_info_result.get("keywords", []),
            focus_points=updated_focus_points,
            current_focus=focus_result.get("current_focus", "")
        )
    
    except Exception as e:
        logger.error(f"Chat API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"处理聊天请求时发生错误: {str(e)}")

@router.get("/user-focus/{session_id}")
async def get_user_focus(session_id: int, db: Session = Depends(get_db)):
    """
    获取用户关注点
    
    Args:
        session_id: 会话ID
        db: 数据库会话
    
    Returns:
        用户关注点字典
    """
    try:
        # 获取用户关注点
        focus_points = shared_cache.get_user_focus(session_id, db=db)
        
        if not focus_points:
            # 查询数据库
            user_focus = db.query(UserFocus).filter(UserFocus.session_id == session_id).first()
            
            if not user_focus:
                return {"message": "用户关注点不存在", "focus_points": {}}
            
            # 确保从数据库获取的数据格式正确
            focus_content = user_focus.focus_content
            if isinstance(focus_content, str):
                try:
                    focus_points = json.loads(focus_content)
                except json.JSONDecodeError:
                    logger.error(f"无法解析用户关注点JSON: {focus_content}")
                    focus_points = {}
            else:
                focus_points = focus_content
            
            # 更新缓存
            shared_cache.update_user_focus(session_id, focus_points)
        
        return {
            "session_id": session_id,
            "focus_points": focus_points
        }
    
    except Exception as e:
        logger.error(f"Get user focus error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取用户关注点时发生错误: {str(e)}")

@router.post("/medical-record", response_model=MedicalRecordResponse)
async def update_medical_record(record: MedicalRecordCreate, db: Session = Depends(get_db)):
    """
    更新医疗记录
    
    Args:
        record: 医疗记录请求
        db: 数据库会话
    
    Returns:
        更新后的医疗记录
    """
    try:
        # 验证会话存在
        session = db.query(ChatSession).filter(ChatSession.id == record.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="聊天会话不存在")
        
        # 更新缓存中的医疗记录
        shared_cache.update_medical_record(record.session_id, record.record_content)
        
        # 查找现有的医疗记录
        medical_record = db.query(MedicalRecord).filter(MedicalRecord.session_id == record.session_id).first()
        
        if medical_record:
            # 更新现有记录
            medical_record.record_content = record.record_content
            db.commit()
            db.refresh(medical_record)
        else:
            # 创建新记录
            medical_record = MedicalRecord(
                session_id=record.session_id,
                record_content=record.record_content
            )
            db.add(medical_record)
            db.commit()
            db.refresh(medical_record)
        
        return MedicalRecordResponse(
            id=medical_record.id,
            session_id=medical_record.session_id,
            record_content=medical_record.record_content,
            created_at=medical_record.created_at,
            updated_at=medical_record.updated_at
        )
    
    except Exception as e:
        logger.error(f"Medical record API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新医疗记录时发生错误: {str(e)}")

@router.get("/medical-record/{session_id}", response_model=MedicalRecordResponse)
async def get_medical_record(session_id: int, db: Session = Depends(get_db)):
    """
    获取医疗记录
    
    Args:
        session_id: 会话ID
        db: 数据库会话
    
    Returns:
        医疗记录
    """
    try:
        # 查找医疗记录
        medical_record = db.query(MedicalRecord).filter(MedicalRecord.session_id == session_id).first()
        
        if not medical_record:
            raise HTTPException(status_code=404, detail="医疗记录不存在")
        
        return MedicalRecordResponse(
            id=medical_record.id,
            session_id=medical_record.session_id,
            record_content=medical_record.record_content,
            created_at=medical_record.created_at,
            updated_at=medical_record.updated_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get medical record API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取医疗记录时发生错误: {str(e)}") 