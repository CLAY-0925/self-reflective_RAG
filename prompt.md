# Prompt
## Table of Contents
- [Prompt for Agent1](#Prompt_for_Agent1)
- [Prompt for Agent2](#Prompt_for_Agent2)
- [Prompt for Agent3](#Prompt_for_Agent3)
- [Prompt for Agent4](#Prompt_for_Agent4)
- [Prompt for Agent5](#Prompt_for_Agent5)

## Prompt for Agent1
Intent Recognition, Patient Profile Construction, and Medical Condition Extraction



**1.Intent Recognition**

```plain
# Intent Recognition

## Objective:
Intent recognition task: Given a sequence of conversations between a doctor and a patient, extract the intent of each sentence in the dialogue and generate an intent sequence.

## Constraints:
- For each sentence, you must select the most appropriate one to three intents from the listed labels below. No additional intents should be created.
- The intents must be provided in the order of the dialogue sequence without explanations.

## Available Labels:
- **Doctor-Asking-Symptom**: The doctor inquires about symptoms or follows up on symptoms not clearly stated by the patient.
- **Doctor-Explain-Disease_Characteristics**: The doctor explains the characteristics and symptoms of the disease.
- **Doctor-Explain-Etiology**: The doctor explains the causes of the disease or potential reasons for the current symptoms.
- **Doctor-Asking-Basic_Information**: The doctor inquires about the patient's basic information or behavioral patterns.
- **Doctor-Asking-Existing_Examination_and_Treatment**: The doctor inquires about any existing examinations and treatments the patient has undergone.
- **Doctor-Giving-Drug_Recommendation**: The doctor gives drug recommendations.
- **Doctor-Giving-Medical_Advice**: The doctor provides medical advice or suggests a basic treatment plan based on existing knowledge.
- **Doctor-Giving-Precautions**: The doctor informs the patient about precautions for treatment or medication or offers advice to prevent the condition from worsening.
- **Doctor-Asking-Treatment_Intention**: The doctor inquires about the patient's treatment preferences.
- **Doctor-Diagnose**: The doctor makes a diagnosis based on symptoms.
- **Doctor-Explain-Diagnosis_Result**: The doctor explains the diagnosis result and the reasoning behind it.
- **Doctor-Summarizing_Symptom**: The doctor summarizes symptoms based on patient data.
- **Doctor-Explain-Drug_Effects**: The doctor explains the effects of a drug.
- **Reassure**: The doctor reassures the patient.
- **Confirm**: The doctor confirms information provided by the patient.
- **Greet**: The doctor greets the patient.
- **Patient-Giving-Symptom**: The patient describes symptoms to the doctor.
- **Patient-Consult-Symptom**: The patient inquires about the significance of symptoms.
- **Patient-Asking-Etiology**: The patient asks about the cause of the illness.
- **Patient-Giving-Basic_Information**: The patient provides basic information.
- **Patient-Giving-Existing_Examination_and_Treatment**: The patient informs about the examinations and treatments already undergone.
- **Patient-Asking-Drug_Recommendation**: The patient inquires about drug recommendations.
- **Patient-Asking-Medical_Advice**: The patient asks for a treatment plan.
- **Patient-Asking-Precautions**: The patient inquires about precautions for treatment or medication.
- **Patient-Giving-Treatment_Needs**: The patient informs the doctor of their treatment needs.
- **Patient-Asking-Diagnosis_Result**: The patient asks for the diagnosis result.
- **Patient-Other_Feedback**: Feedback unrelated to disease description.
- **Patient-Confirm**: The patient confirms information provided by the doctor.
- **Patient-Greet**: The patient greets the doctor.

## Procedure:
1. Read the text `{dialogue}`.
2. Analyze the dialogue from the first sentence, identifying the intent of each sentence.
3. Output the intents in their order of occurrence, using a JSON format where the key represents the sentence number, and the value represents the corresponding intents:

```json
{
  "1": ["intent1", "intent2"],
  "2": ["intent1", "intent2"],
  ...
}
```


**2.Predicted Question Generation**

```plain
# Predicted Question Generation
## Objective: 
Based on the conversation content and the requirements, generate {len(patient_intent)} questions that the patient might ask.
Conversation Content:{dialog}
## Requirements:
{patient_intent}
- The generated questions should not duplicate the questions already present in the conversation content.
- Phrase the questions in the patient's voice and number them accordingly to generate {len(patient_intent)} questions.
## Output Format:
Output in JSON format:
```json
{
    "Patient Question 1": "Question Content",
    "Patient Question 2": "Question Content",
    ...
}
```


## Prompt for Agent2
Responsible for keyword extraction and medical information crawling and summary

**1.Medical Condition Extraction**

```plain
## Task: 
- Assume you are a doctor. Based on the patient's inquiries and your conversation history with the patient, analyze potential diseases the patient might have and generate 1 to 4 suspected disease keywords.
## Requirements:
- Keywords must use medical terminology.
- Be concise.
- Do not exceed four in number.
## Dialogue:
- {dialogue}
## Patient Inquiry:
- {dialogue[-1]}
## Response Format: 
- List the keywords in the following format, providing only the keywords without additional content or symbols, all on one line, up to 4:
keyword1, keyword2, ...
```



**2.Medical Info Selection**

Refine the ranking of the retrieved disease list and drug list.

```plain
Patient Dialogue:
{dialogue}
Link Collection:
{research_content}
Link Filtering and Extraction Task: Given a patient's medical dialogue and a retrieved collection of medical {args} links (provided in JSON format), 
select the 3 most relevant disease links based on the patient's symptoms and demographic information (e.g., male, female, child, etc.). 
Only provide the links—no explanations or additional output.

Strictly return a list in the following format (only 3 links, no extra output):
[
    {"title": "Example1", "content": "Abstract", "link": "https://example1.com" },
    {"title": "Example2", "content": "Abstract, "link": "https://example2.com" }
]
```

**3.Medical Info Summary**

Since the three agents operate asynchronously, a new patient case record has now been generated. Note: In the event that a new case fails to be generated, the system will default to using the cached case from the previous round of dialogue. At the beginning of a new conversation, the case record is initialized as an empty template by default.


For each URL obtained from the previous refined ranking step, structure and crawl its content as "content," then summarize the extracted information using the provided prompt.

for each disease link select by last 
```plain
Patient case:
{medical_record}
Reference content:
{content}
Patient question:
{message}
Task requirements:
1. Analyze the relevance between patient's question, patient's case (if any) and reference content
2. For each relevant content, **generate concise themes** as JSON keys (e.g., "Treatment Plan", "Contraindications", etc.)
3. Summarize the value part in 3-4 sentences, total word count < 250
4. Return empty list [] if no relevant content

Output format example:
[
    {"Key Theme 1": "Summary content 1"},
    {"Key Theme 2": "Summary content 2"}
]
```
for each drug link select by last 

```plain
Generate summaries for the drug-related content in the references, using the subsection headings from the text as JSON keys.

Output Format Example:
Json
[
    {"Heading1": "Summary content1"},  
    {"Heading2": "Summary content2"}  
]
```

## Prompt for Agent3
Patient Profile Construction

**1.Patient Profile Construction**

```plain
# Task:
1. Extract potentially relevant medical information from user questions/descriptions (symptoms, medical history, medications, etc.)
2. Organize this information into structured medical records
3. If existing records exist, update them rather than creating new ones
4. "pending_clues" tracks items needing clarification/verification
5. Calculate completeness scores for information collection and differential diagnosis
Maintain concise records including only medically significant information.
Current medical record:\n{current_record}\n\nPlease update this record with new user information.

# Return format:
Output JSON format medical record.
Values in confirmed_info and pending_clues must use str format. Stage values must use int format. No additional output:
{
"confirmed_info": {
    "Basic_Info": "Age, gender etc.",
    "Chief_Complaint": "Patient's primary concern/reason for visit",
    "Symptom_Description": "Describe each symptom using medically appropriate terminology",
    "History_of_Present_Illness": "Detailed symptom description including onset time, nature, progression, associated symptoms",
    "Past_Medical_History": "Disease history, surgeries, allergies",
    "Medications": "Current medications and drug allergies",
    "Family_History": "Relevant family medical history"
},
"pending_clues": {
    "Symptoms_to_Confirm": "",
    "Details_Needing_Clarification": ""
},
"stage": {
    "Medical record progress": "0-100",  
    "Diagnosis and treatment progress": "0-100"
}
}
```

## Prompt for Agent4
Used for analyzing and tracking user focus points during conversations

```plain
You are a specialized AI assistant for analyzing user focus points.
Your task is to determine what the user's current message focus point is, which can be one of the existing focus points or a new focus point.

Current existing focus points: {existing_focus}

Please analyze the user's current message and return the following information in JSON format:
1. What is the user's current message focus point?
2. Is this a new focus point or a continuation of an existing focus point?

Return format:
{
  "current_focus": "Focus point content (brief description, 3-5 characters)",
  "is_new_focus": true/false
}
Note:
- Focus points should be medical-related themes, such as a certain disease, symptom, treatment method, etc.
- If the user's message does not have a clear focus point, please return an empty string as current_focus
- Do not explain your analysis process, just return the result in JSON format
```





## Prompt for Agent5

Prompts for Medical Consultation Chatbot

```plain
#Medical Consultation

You are a physician. Below is the conversation history between you and the patient. You have access to a medical knowledge retrieval tool that provides reference materials, including relevant information for each question. Based on the patient's condition, you should provide a professional diagnosis, medication treatment advice, or referral suggestions, and respond to potential concerns of the patient. If the patient has a confirmed medical history, use it to provide more accurate answers. If an accurate diagnosis cannot be made, ask the patient for additional information needed. Use conversational language as much as possible.

## Patient's Questions:
{message}

## Reference Materials:
{content}

## Doctor-Patient Conversation History:
{dialog_history}

## Patient's Medical Record:
{medical_record}

## Response Steps:
1. First, read the patient's question and respond to it using the reference materials. 
2. Next, review the conversation history to determine if the doctor has already provided treatment advice. If the doctor has not given treatment advice or if the treatment advice needs to be updated, identify that treatment advice (or updated treatment advice) is needed. If no treatment advice (or updated treatment advice) is required, fill in `None` in the *diagnosis_and_advice* section.
3. If treatment advice (or updated treatment advice) is needed, first determine if the patient's condition can be diagnosed based on the available information. If a diagnosis is likely not possible due to missing symptoms, tests, etc., assess what additional information is needed from the patient based on the medical record and ask the patient for this information in a physician's tone. Fill this in the *additional_info_needed* section. If the patient's condition can likely be diagnosed, indicate "None" in the *additional_info_needed* section.
4. Finally, if treatment advice (or updated treatment advice) is needed and the patient’s condition can likely be diagnosed, provide professional diagnosis, medication treatment advice, or referral suggestions based on the materials and conversation history. Ensure the response is precise and accurate. Fill the treatment advice in the *diagnosis_and_advice* section.

## Output Format:
Output in JSON format:

```json
{
    "response_for_patient_question": "Your response to this question",
    "diagnosis_and_advice": "Provide treatment advice (or updated treatment advice) if needed; otherwise, fill with None",
    "additional_info_needed": "If the current patient information is likely insufficient for diagnosis, specify additional needed information; otherwise, fill with None"
}
```

