import React, { useState } from 'react';
import { Card, Progress, Collapse, Button, Input, Form, message } from 'antd';
import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useChat } from '../../context/ChatContext';
import { MedicalRecord as MedicalRecordType } from '../../types';

const { TextArea } = Input;
const { Panel } = Collapse;

// Default empty medical record structure
const defaultMedicalRecord: MedicalRecordType = {
  confirmed_info: {
    Basic_Info: '',
    Chief_Complaint: '',
    Symptom_Description: '',
    History_of_Present_Illness: '',
    Past_Medical_History: '',
    Medications: '',
    Family_History: ''
  },
  pending_clues: {
    Symptoms_to_Confirm: '',
    Details_Needing_Clarification: ''
  },
  stage: {
    "Medical record progress": 0,
    "Diagnosis and treatment progress": 0
  }
};

const MedicalRecord: React.FC = () => {
  const { medicalRecord, updateMedicalRecord } = useChat();
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  
  // Use provided medical record or default record
  const recordToDisplay = medicalRecord || defaultMedicalRecord;
  
  const handleFinish = (values: any) => {
    try {
      let stage = { ...recordToDisplay.stage };
      
      if (!stage || typeof stage !== 'object') {
        stage = { "Medical record progress": 0, "Diagnosis and treatment progress": 0 };
      }
      
      if (stage["Medical record progress"] !== undefined) {
        let value = stage["Medical record progress"];
        if (typeof value === 'string') {
          value = parseInt((value as string).replace('%', ''), 10);
        }
        stage["Medical record progress"] = isNaN(Number(value)) ? 0 : Number(value);
      } else {
        stage["Medical record progress"] = 0;
      }
      
      if (stage["Diagnosis and treatment progress"] !== undefined) {
        let value = stage["Diagnosis and treatment progress"];
        if (typeof value === 'string') {
          value = parseInt((value as string).replace('%', ''), 10);
        }
        stage["Diagnosis and treatment progress"] = isNaN(Number(value)) ? 0 : Number(value);
      } else {
        stage["Diagnosis and treatment progress"] = 0;
      }
      
      const updatedRecord: MedicalRecordType = {
        confirmed_info: {
          Basic_Info: values.Basic_Info || '',
          Chief_Complaint: values.Chief_Complaint || '',
          Symptom_Description: values.Symptom_Description || '',
          History_of_Present_Illness: values.History_of_Present_Illness || '',
          Past_Medical_History: values.Past_Medical_History || '',
          Medications: values.Medications || '',
          Family_History: values.Family_History || ''
        },
        pending_clues: {
          Symptoms_to_Confirm: values.Symptoms_to_Confirm || '',
          Details_Needing_Clarification: values.Details_Needing_Clarification || ''
        },
        stage: stage
      };
      
      updateMedicalRecord(updatedRecord);
      setIsEditing(false);
      message.success('Medical record updated');
    } catch (error) {
      message.error('Update failed');
      console.error(error);
    }
  };
  
  if (isEditing) {
    return (
      <Card 
        title="Edit Medical Record" 
        className="mb-4"
        extra={
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
          >
            Save
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            Basic_Info: recordToDisplay.confirmed_info.Basic_Info,
            Chief_Complaint: recordToDisplay.confirmed_info.Chief_Complaint,
            Symptom_Description: recordToDisplay.confirmed_info.Symptom_Description,
            History_of_Present_Illness: recordToDisplay.confirmed_info.History_of_Present_Illness,
            Past_Medical_History: recordToDisplay.confirmed_info.Past_Medical_History,
            Medications: recordToDisplay.confirmed_info.Medications,
            Family_History: recordToDisplay.confirmed_info.Family_History,
            Symptoms_to_Confirm: recordToDisplay.pending_clues.Symptoms_to_Confirm,
            Details_Needing_Clarification: recordToDisplay.pending_clues.Details_Needing_Clarification
          }}
          onFinish={handleFinish}
        >
          <Collapse defaultActiveKey={['1', '2']}>
            <Panel header="Confirmed Information" key="1">
              <Form.Item name="Basic_Info" label="Basic Information">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="Chief_Complaint" label="Chief Complaint">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="Symptom_Description" label="Symptom Description">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="History_of_Present_Illness" label="History of Present Illness">
                <TextArea rows={3} />
              </Form.Item>
              <Form.Item name="Past_Medical_History" label="Past Medical History">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="Medications" label="Medications">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="Family_History" label="Family History">
                <TextArea rows={2} />
              </Form.Item>
            </Panel>
            <Panel header="Information to Confirm" key="2">
              <Form.Item name="Symptoms_to_Confirm" label="Symptoms to Confirm">
                <TextArea rows={3} />
              </Form.Item>
              <Form.Item name="Details_Needing_Clarification" label="Details Needing Clarification">
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
      title="Medical Record" 
      className="mb-4"
      extra={
        <Button 
          icon={<EditOutlined />} 
          onClick={() => setIsEditing(true)}
        >
          Edit
        </Button>
      }
    >
      <div className="mb-4">
        <div className="mb-2 font-medium">Consultation Progress</div>
        <div className="flex mb-1">
          <span>Case Progress</span>
        </div>
        <Progress 
          percent={(() => {
            if (!recordToDisplay.stage) return 0;
            
            let value = recordToDisplay.stage["Medical record progress"];
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
          <span>Treatment Progress</span>
        </div>
        <Progress 
          percent={(() => {
            if (!recordToDisplay.stage) return 0;
            
            let value = recordToDisplay.stage["Diagnosis and treatment progress"];
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
        <Panel header="Confirmed Information" key="1">
          {recordToDisplay.confirmed_info ? (
            Object.entries(recordToDisplay.confirmed_info).map(([key, value]) => (
              <div key={key} className="mb-3">
                <div className="font-medium text-sm text-gray-500">{key}</div>
                <div className="mt-1">
                  {value || <span className="text-gray-400">No data</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-400">No confirmed information</div>
          )}
        </Panel>
        
        <Panel header="Information to Confirm" key="2">
          {recordToDisplay.pending_clues ? (
            <>
              <div className="mb-3">
                <div className="font-medium text-sm text-gray-500">Unconfirmed Symptoms</div>
                <div className="mt-1">
                  {recordToDisplay.pending_clues.Symptoms_to_Confirm || <span className="text-gray-400">No data</span>}
                </div>
              </div>
              
              <div>
                <div className="font-medium text-sm text-gray-500">Details to Clarify</div>
                <div className="mt-1">
                  {recordToDisplay.pending_clues.Details_Needing_Clarification || <span className="text-gray-400">No data</span>}
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-400">No information to confirm</div>
          )}
        </Panel>
      </Collapse>
    </Card>
  );
};

export default MedicalRecord; 