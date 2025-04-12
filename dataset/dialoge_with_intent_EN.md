# <font style="color:rgb(44, 44, 54);">Dialogue With Intent</font>
## <font style="color:rgb(44, 44, 54);">Table of Contents</font>
- [Introduce](#Introduce)
- [Before and After Annotation](#Before-and-After-Annotation)
- [Complete Sample](#complete-Sample)


## Introduce
| Dialogue Act  | Percentage  | Dialogue Act  | Percentage  |
| --- | --- | --- | --- |
| Asking Symptom | 11.97% | Asking Drug Recommendation | 3.27% |
| Asking Existing Examination and Treatment | 4.04% | Asking Precautions | 1.77% |
| Asking Basic Information | 1.98% | Asking Medical Advice | 1.43% |
| Asking Treatment Intention | 0.20% | Asking Etiology | 0.69% |
| Giving Medical Advice | 6.70% | Asking Diagnosis Result | 0.41% |
| Giving Drug Recommendation | 6.12% | Giving Symptom | 18.07% |
| Giving Precautions | 4.31% | Giving Existing Examination & Treatment | 4.87% |
| Explain Disease Characteristics | 3.90% | Giving Basic Information | 1.56% |
| Explain Etiology | 2.84% | Giving Treatment Needs | 0.81% |
| Explain Drug Effects | 1.21% | Consult Symptom | 2.39% |
| Explain Diagnosis Result | 0.21% | Confirm | 6.48% |
| Reassure | 4.31% | Greet | 1.68% |
| Confirm | 1.72% | Other Feedback | 1.61% |
| Diagnose | 1.29% | Others | 0.20% |
| Greet | 3.25% |  |  |
| Summarizing Symptom | 0.40% |  |  |
| Others | 0.32% |  |  |


## <font style="color:rgb(44, 44, 54);">Before and After Annotation</font>
1.before:

```json
"dialogue": [
    {
        "sentence_id": "1",
        "speaker": "doctor",
        "sentence": "hello"
    }
]
```

2.after:

```json
"dialogue": [
    {
        "sentence_id": "1",
        "speaker": "doctor",
        "sentence": "hello",
        "dialogue_act": "Greet"
    }
]
```

## <font style="color:rgb(44, 44, 54);">Complete Sample</font>
```
Doctor: Hello /                       Greet
Doctor: Are you there? /              Greet
Patient: Is this stool normal? /    Patient-Consult-Symptom
Doctor: From the picture you sent, the child's stool is a bit loose, and there is mucus in the stool. /   Doctor-Explain Diagnosis Result
Patient: If it's not normal, is it related to the formula I'm feeding? /  Patient-Asking-Etiology
Doctor: The main issue is the presence of mucus in the stool, and a routine stool test is needed. /  Doctor-Giving-Medical_Advice
Doctor: It's not particularly related to the formula. /   Doctor-Explain-Etiology
Doctor: How long has this child been using this formula? /   Doctor-Asking-Basic_Information
Patient: What's going on then? /  Patient-Asking-Etiology
Doctor: How old is the child now? /   Doctor-Asking-Basic_Information
Doctor: We need to consider it might be caused by poor digestive function. /   Doctor-Explain-Etiology
Patient: It hasn't been long, about forty days. /   Patient-Giving-Basic_Information
Doctor: How many times does the child have a bowel movement each day? /   Doctor-Asking-Symptom
Patient: About four or five times. / Patient-Giving-Symptom
Doctor: For a child of this age with this type of stool, we should first consider overfeeding, and also pay attention to the mother's diet. /  Doctor-Explain-Etiology
Doctor: Have you had a routine stool test done? /   Doctor-Asking-Existing_Examination_and_Treatment
Doctor: A routine stool test is needed, mainly to check for inflammation in the stool. /   Doctor-Giving-Medical_Advice
Doctor: If there is no inflammation in the stool, then we should consider simple poor digestive function. /   Doctor-Giving-Medical_Advice
Patient: I've been eating seafood and spicy food these past two days. /   Patient-Giving-Symptom
Patient: He cries if he doesn't get fed every time. /  Patient-Giving-Symptom
Doctor: This might be related. /   Doctor-Explain-Etiology
Patient: I can also hear gurgling in his stomach. /  Patient-Giving-Symptom
Doctor: That's the sound of faster bowel movements. /  Doctor-Explain-Disease_Characteristics
Doctor: The mother should try to avoid seafood and spicy, stimulating foods. /  Doctor-Giving-Precautions
Patient: So, what should I do in this situation? Do I need to go to the hospital? /  Patient-Asking-Medical_Advice
Doctor: Eating these foods will affect the quality of the milk, leading to the child having diarrhea. /  Doctor-Giving-Precautions
Doctor: The child needs to go to the hospital for a routine stool test. /  Doctor-Giving-Medical_Advice
Doctor: If there is no inflammation in the stool, then it should not be a big problem. /  Doctor-Explain-Disease_Characteristics
Doctor: The child can be given oral Smecta to protect the intestinal mucosa, and Mommy Love to improve the intestinal micro-ecological environment. /     Doctor-Giving-Drug_Recommendation
Patient: Okay, thank you, doctor. What should I do for the baby? /  Patient-Asking Medical Advice
Doctor: The child should be fed in small amounts multiple times, with appropriate abdominal massage to improve gastrointestinal function. /     Doctor-Giving-Medical_Advice
Patient: Okay, I understand, thank you. /  Confirm


```



