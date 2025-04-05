# 医学知识聊天机器人

这是一个基于Python FastAPI的医学知识聊天机器人后端项目，使用通义千问API提供智能对话能力，并集成了多个专业Agent来处理用户的医疗咨询。

## 项目特点

- 多Agent协同工作的架构设计
- 基于通义千问API的智能对话
- 医疗知识实时爬取（丁香园、默沙东）
- 患者病例自动总结与更新
- 完整的会话历史管理
- 高度异步并行处理
- WebSocket实时交互通信
- 用户关注点智能追踪
- 分析过程实时反馈

## 项目结构

```
medical_bot/
├── app/                       # 主应用目录
│   ├── api/                   # API层
│   │   ├── agents/            # 各种Agent实现
│   │   │   ├── base_agent.py  # 基础Agent抽象类
│   │   │   ├── intent_agent.py    # 意图识别Agent
│   │   │   ├── medical_info_agent.py  # 医疗信息查询Agent
│   │   │   ├── medical_record_agent.py  # 病例总结Agent
│   │   │   ├── focus_agent.py    # 用户关注点Agent 
│   │   │   └── response_agent.py  # 响应生成Agent
│   │   ├── routes/            # 路由定义
│   │   │   ├── chat.py        # 聊天相关路由
│   │   │   ├── user.py        # 用户相关路由
│   │   │   └── message.py     # 消息相关路由
│   │   └── api.py             # API路由聚合
│   ├── models/                # 数据库模型
│   │   └── chat.py            # 聊天相关模型
│   ├── schemas/               # Pydantic模式
│   │   └── chat.py            # 聊天相关请求/响应模式
│   ├── services/              # 服务层
│   │   ├── dashscope_service.py  # 通义API服务
│   │   ├── crawler_service.py    # 医疗信息爬虫服务
│   │   └── cache_service.py      # 共享内存缓存服务
│   ├── utils/                 # 工具类
│   │   └── database.py        # 数据库配置
│   └── main.py                # 主应用入口
├── .env                       # 环境变量配置
└── run.py                     # 启动脚本
```

## 安装与运行

### 前置条件

- Python 3.10
- MySQL 8.0

### 环境配置

1. 克隆项目:

```bash
git clone <项目仓库地址>
cd medical_bot
```

2. 安装依赖:

```bash
pip install -r requirements.txt
```

3. 配置环境变量:

编辑 `.env` 文件，设置MySQL数据库链接地址、API密钥、模型名称:

```
DATABASE_URL=YOUR_DATABASE_URL
DASHSCOPE_API_KEY=YOUR_DASHSCOPE_API_KEY
FAST_MODEL=qwen2.5-7b-instruct-1m
LARGE_MODEL=deepseek-v3
```

数据库连接信息已在代码中配置，如需修改，请编辑 `app/utils/database.py` 文件中的连接参数。

### 初始化数据库

运行以下命令创建数据库和表结构:

```bash
python init_db.py
```

### 启动服务

```bash
python run.py
```

服务将在 http://localhost:8000 启动，API文档可以在 http://localhost:8000/docs 访问。

## API接口

### 聊天相关

- `POST /api/chat` - 发送聊天消息（REST API）
- `WebSocket /api/ws/chat` - WebSocket实时聊天接口
- `POST /api/medical-record` - 更新医疗记录
- `GET /api/medical-record/{session_id}` - 获取医疗记录
- `GET /api/user-focus/{session_id}` - 获取用户关注点

### 用户相关

- `POST /api/users` - 创建用户
- `GET /api/users/{user_id}` - 获取用户信息
- `GET /api/users` - 获取用户列表

### 会话相关

- `POST /api/sessions` - 创建会话
- `GET /api/users/{user_id}/sessions` - 获取用户会话列表
- `GET /api/sessions/{session_id}` - 获取会话信息

### 消息相关

- `GET /api/sessions/{session_id}/messages` - 获取会话消息历史
- `GET /api/messages/{message_id}` - 获取消息详情
- `DELETE /api/sessions/{session_id}/messages` - 清空会话消息
- `GET /api/statistics/messages/{session_id}` - 获取会话消息统计

## 功能流程

1. 用户创建账户并创建聊天会话
2. 用户发送医疗咨询消息
3. 后端启动多个Agent并行处理:
   - 意图Agent分析用户意图并生成联想问题
   - 医疗信息Agent提取关键词并从医疗网站获取相关知识
   - 病例Agent从对话中提取并更新病例信息
   - 关注点Agent追踪用户关注的医疗主题
4. 最后，响应Agent整合各个Agent的结果，生成最终回复
5. 响应和联想问题返回给用户

## 用户关注点追踪

系统会自动分析并追踪用户在整个对话过程中的关注点:

- 识别用户当前消息的主要关注点(如"头痛"、"过敏反应"等)
- 记录每个关注点涉及的消息ID区间
- 区分新出现的关注点和延续讨论的已有关注点
- 存储关注点数据到数据库和缓存中
- 提供专门的API接口查询会话的关注点历史

关注点数据结构示例:
```json
{
  "头痛问题": [[1, 6], [10, 12]],
  "过敏反应": [[7, 9]]
}
```

## WebSocket实时通信

系统提供WebSocket接口，支持:

- 实时双向通信
- 处理过程实时反馈
- 每个Agent的进度状态更新
- 最终结果流式返回

WebSocket处理流程:
1. 前端建立WebSocket连接
2. 发送用户消息
3. 后端响应进度更新:
   - 各Agent处理状态("分析中"→"已完成")
   - 各Agent产生的中间结果
4. 所有Agent完成后，发送最终综合响应

## 技术栈

- **FastAPI**: 高性能异步API框架
- **SQLAlchemy**: ORM数据库操作
- **Pydantic**: 数据验证和序列化
- **asyncio**: 异步并发处理
- **WebSockets**: 实时双向通信
- **通义千问API**: 大模型对话能力
- **beautifulsoup4**: 网页解析
- **requests**: HTTP请求
- **内存缓存系统**: 高性能数据缓存
- **JSON**: 结构化数据交换

## 缓存管理机制

系统实现了高效的内存缓存管理机制，用于优化性能和提高响应速度：

- **多级缓存策略**：优先从内存缓存获取数据，缓存未命中时从数据库加载
- **自动缓存更新**：数据变更时自动更新缓存，保持数据一致性
- **会话数据缓存**：缓存用户会话信息、聊天历史、医疗记录和用户关注点
- **Agent结果缓存**：缓存各Agent的处理结果，避免重复计算
- **缓存时间戳**：记录缓存数据的时间戳，支持基于时间的缓存策略
- **内存优化**：智能管理缓存大小，避免内存溢出
- **失效策略**：会话结束时自动清理相关缓存数据

缓存系统显著提升了系统性能：
1. 减少数据库查询次数，降低数据库负载
2. 加快WebSocket响应速度，提升实时体验
3. 优化多用户并发访问性能
4. 确保用户会话连续性，即使在临时连接中断后

系统使用自定义的`SharedCache`类实现缓存功能，该类作为单例在所有请求间共享，确保数据的一致性和可靠性。

## 执行顺序

为正确运行此项目，请按以下顺序执行命令：

1. 安装依赖:
```bash
pip install -r requirements.txt
```

2. 配置参数:
编辑 `.env` 文件设置 `DASHSCOPE_API_KEY`等参数

3. 初始化数据库:
```bash
python init_db.py
```

4. 启动服务:
```bash
python run.py
```

5. 使用Postman测试API接口

## 系统要求

- **CPU**: 双核处理器或更高
- **内存**: 4GB RAM 或更高
- **存储**: 最少需要 500MB 可用空间
- **网络**: 稳定的互联网连接（用于API调用）
- **操作系统**: Windows 10+, macOS, Linux

## 开发环境

- **Python**: 3.8+ (推荐3.10)
- **IDE**: Visual Studio Code 或 PyCharm
- **数据库**: MySQL 8.0
- **API测试**: Postman 或 Insomnia 