import json
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def JsonParser(result,type):
    #找到第一个[的位置，如果[的位置比{靠前，则提取[]的内容

    first_brace = result.find('[')
    last_brace = result.rfind(']')


    first_bracket = result.find('{')
# 找到最后一个}的位置
    last_bracket = result.rfind('}')

    extracted_content = ''
    if first_brace != -1 and first_brace < first_bracket and last_brace > last_bracket:
        extracted_content = result[first_brace :last_brace+1]
    elif first_bracket != -1 and last_bracket != -1 and first_bracket < last_bracket:
        # 截取第一个{和最后一个}之间的内容
        extracted_content = result[first_bracket :last_bracket+1]
    #print(extracted_content)
    extracted_content = extracted_content.replace('\n', '').replace('\r', '')
    extracted_content = extracted_content.replace('\\n', '').replace('\\r', '')
    try:
        data = json.loads(extracted_content.replace("'", '"'))
        #print(extracted_content)
        return data
    except Exception as e:
        logger.error(f"解析关键词提取结果失败: {result},{e}")
        if type == "list":
            return []
        if type == 'json':
            return {}
