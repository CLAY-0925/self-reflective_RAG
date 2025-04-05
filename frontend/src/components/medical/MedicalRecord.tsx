import React, { useState } from 'react';
import { Card, Progress, Collapse, Button, Input, Form, message } from 'antd';
import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useChat } from '../../context/ChatContext';
import { MedicalRecord as MedicalRecordType } from '../../types';

const { TextArea } = Input;
const { Panel } = Collapse;

// 默认的空医疗记录结构
const defaultMedicalRecord: MedicalRecordType = {
  confirmed_info: {
    基本信息: '',
    主诉: '',
    症状描述: '',
    现病史: '',
    既往史: '',
    用药情况: '',
    家族史: ''
  },
  pending_clues: {
    待确认症状: '',
    需澄清细节: ''
  },
  stage: {
    信息收集: 0,
    鉴别诊断: 0
  }
};

const MedicalRecord: React.FC = () => {
  const { medicalRecord, updateMedicalRecord } = useChat();
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  
  // 使用提供的医疗记录或默认记录
  const recordToDisplay = medicalRecord || defaultMedicalRecord;
  
  const handleFinish = (values: any) => {
    try {
      // 确保stage字段的值是有效的数字
      let stage = { ...recordToDisplay.stage };
      
      // 如果stage不存在或结构不完整，创建默认的stage对象
      if (!stage || typeof stage !== 'object') {
        stage = { 信息收集: 0, 鉴别诊断: 0 };
      }
      
      // 确保信息收集和鉴别诊断字段是数字
      if (stage.信息收集 !== undefined) {
        let value = stage.信息收集;
        if (typeof value === 'string') {
          value = parseInt((value as string).replace('%', ''), 10);
        }
        stage.信息收集 = isNaN(Number(value)) ? 0 : Number(value);
      } else {
        stage.信息收集 = 0;
      }
      
      if (stage.鉴别诊断 !== undefined) {
        let value = stage.鉴别诊断;
        if (typeof value === 'string') {
          value = parseInt((value as string).replace('%', ''), 10);
        }
        stage.鉴别诊断 = isNaN(Number(value)) ? 0 : Number(value);
      } else {
        stage.鉴别诊断 = 0;
      }
      
      const updatedRecord: MedicalRecordType = {
        confirmed_info: {
          基本信息: values.基本信息 || '',
          主诉: values.主诉 || '',
          症状描述: values.症状描述 || '',
          现病史: values.现病史 || '',
          既往史: values.既往史 || '',
          用药情况: values.用药情况 || '',
          家族史: values.家族史 || ''
        },
        pending_clues: {
          待确认症状: values.待确认症状 || '',
          需澄清细节: values.需澄清细节 || ''
        },
        stage: stage
      };
      
      updateMedicalRecord(updatedRecord);
      setIsEditing(false);
      message.success('医疗记录已更新');
    } catch (error) {
      message.error('更新失败');
      console.error(error);
    }
  };
  
  if (isEditing) {
    return (
      <Card 
        title="编辑医疗记录" 
        className="mb-4"
        extra={
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
          >
            保存
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            基本信息: recordToDisplay.confirmed_info.基本信息,
            主诉: recordToDisplay.confirmed_info.主诉,
            症状描述: recordToDisplay.confirmed_info.症状描述,
            现病史: recordToDisplay.confirmed_info.现病史,
            既往史: recordToDisplay.confirmed_info.既往史,
            用药情况: recordToDisplay.confirmed_info.用药情况,
            家族史: recordToDisplay.confirmed_info.家族史,
            待确认症状: recordToDisplay.pending_clues.待确认症状,
            需澄清细节: recordToDisplay.pending_clues.需澄清细节
          }}
          onFinish={handleFinish}
        >
          <Collapse defaultActiveKey={['1', '2']} className="mb-4">
            <Panel header="已确认信息" key="1">
              <Form.Item name="基本信息" label="基本信息">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="主诉" label="主诉">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="症状描述" label="症状描述">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="现病史" label="现病史">
                <TextArea rows={3} />
              </Form.Item>
              <Form.Item name="既往史" label="既往史">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="用药情况" label="用药情况">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="家族史" label="家族史">
                <TextArea rows={2} />
              </Form.Item>
            </Panel>
            <Panel header="待确认信息" key="2">
              <Form.Item name="待确认症状" label="待确认症状">
                <TextArea rows={3} />
              </Form.Item>
              <Form.Item name="需澄清细节" label="需澄清细节">
                <TextArea rows={3} />
              </Form.Item>
            </Panel>
          </Collapse>
        </Form>
      </Card>
    );
  }
  
  return (
    <Card 
      title="医疗记录" 
      className="mb-4"
      extra={
        <Button 
          icon={<EditOutlined />} 
          onClick={() => setIsEditing(true)}
        >
          编辑
        </Button>
      }
    >
      <div className="mb-4">
        <div className="mb-2 font-medium">问诊进度</div>
        <div className="flex mb-1">
          <span>病例进度</span>
        </div>
        <Progress 
          percent={(() => {
            if (!recordToDisplay.stage) return 0;
            
            let value = recordToDisplay.stage.信息收集;
            if (typeof value === 'string') {
              value = parseInt((value as string).replace('%', ''), 10);
            }
            
            return isNaN(Number(value)) ? 0 : Math.min(Math.max(Number(value), 0), 100);
          })()} 
          status="active" 
          strokeColor="#1677ff" 
          className="mb-2" 
        />
        
        <div className="flex mb-1">
          <span>诊疗进度</span>
        </div>
        <Progress 
          percent={(() => {
            if (!recordToDisplay.stage) return 0;
            
            let value = recordToDisplay.stage.鉴别诊断;
            if (typeof value === 'string') {
              value = parseInt((value as string).replace('%', ''), 10);
            }
            
            return isNaN(Number(value)) ? 0 : Math.min(Math.max(Number(value), 0), 100);
          })()} 
          status="active" 
          strokeColor="#52c41a" 
        />
      </div>
      
      <Collapse defaultActiveKey={['1']}>
        <Panel header="已确认信息" key="1">
          {recordToDisplay.confirmed_info ? (
            Object.entries(recordToDisplay.confirmed_info).map(([key, value]) => (
              <div key={key} className="mb-3">
                <div className="font-medium text-sm text-gray-500">{key}</div>
                <div className="mt-1">
                  {value || <span className="text-gray-400">暂无数据</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-400">暂无确认信息</div>
          )}
        </Panel>
        
        <Panel header="待确认信息" key="2">
          {recordToDisplay.pending_clues ? (
            <>
              <div className="mb-3">
                <div className="font-medium text-sm text-gray-500">待确认症状</div>
                <div className="mt-1">
                  {recordToDisplay.pending_clues.待确认症状 || <span className="text-gray-400">暂无数据</span>}
                </div>
              </div>
              
              <div>
                <div className="font-medium text-sm text-gray-500">需澄清细节</div>
                <div className="mt-1">
                  {recordToDisplay.pending_clues.需澄清细节 || <span className="text-gray-400">暂无数据</span>}
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-400">暂无待确认信息</div>
          )}
        </Panel>
      </Collapse>
    </Card>
  );
};

export default MedicalRecord; 