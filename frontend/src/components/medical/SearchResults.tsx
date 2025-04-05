import React from 'react';
import { Card, List, Typography, Empty, Divider } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useChat } from '../../context/ChatContext';

const { Paragraph, Link, Text } = Typography;

// 安全获取对象属性的函数
const safeGet = (obj: any, path: string, defaultValue: any = ''): any => {
  try {
    const parts = path.split('.');
    let result = obj;
    for (const part of parts) {
      if (result === null || result === undefined) return defaultValue;
      result = result[part];
    }
    return result === null || result === undefined ? defaultValue : result;
  } catch (error) {
    console.error('获取属性失败:', error);
    return defaultValue;
  }
};

// 尝试从URL中获取主机名，如果失败则返回原始链接
const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    console.error('解析URL失败:', error);
    return url;
  }
};

// 清理标题文本，移除"标题:"前缀
const cleanTitle = (title: string): string => {
  if (typeof title !== 'string') return '未知标题';
  return title.replace(/^标题:/, '').trim();
};

const SearchResults: React.FC = () => {
  const { searchResults } = useChat();
  
  // 确保searchResults是一个数组
  const resultsArray = Array.isArray(searchResults) ? searchResults : [];
  
  // 过滤掉可能有问题的结果
  const validResults = resultsArray.filter(item => {
    return (
      item && 
      typeof item === 'object' && 
      (
        // 检查item.title
        (typeof safeGet(item, 'title') === 'string') ||
        // 或者检查source.tittle/source.title
        (item.source && 
         (typeof safeGet(item, 'source.tittle') === 'string' || 
          typeof safeGet(item, 'source.title') === 'string'))
      )
    );
  });
  
  if (!validResults || validResults.length === 0) {
    return (
      <Card title="联网搜索结果" className="mb-4">
        <Empty 
          description="暂无搜索结果" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        />
      </Card>
    );
  }
  
  return (
    <Card title="联网搜索结果" className="mb-4">
      <List
        itemLayout="vertical"
        dataSource={validResults}
        renderItem={(item) => {
          // 处理title字段
          const itemTitle = safeGet(item, 'title', '');
          
          // 处理source字段
          const source = item.source || {};
          const sourceTitleRaw = safeGet(source, 'tittle', safeGet(source, 'title', ''));
          const sourceTitle = cleanTitle(sourceTitleRaw);
          const sourceContent = safeGet(source, 'content', '');
          const sourceLink = safeGet(source, 'link', '#');
          
          // 使用最佳可用标题
          const displayTitle = cleanTitle(itemTitle || sourceTitle);
          
          return (
            <List.Item
              key={displayTitle || Math.random().toString()}
              className="border-b last:border-0 pb-4"
            >
              {/* 标题和链接 */}
              <div className="mb-2">
                <div className="font-medium text-primary-600 dark:text-primary-400 mb-1">
                  {displayTitle}
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <GlobalOutlined className="mr-1" />
                  <Link 
                    href={sourceLink} 
                    target="_blank"
                    className="text-gray-500 hover:text-primary-500"
                  >
                    {getHostname(sourceLink)}
                  </Link>
                </div>
              </div>
              
              {/* 内容摘要 */}
              {sourceContent && (
                <Paragraph 
                  ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
                  className="text-sm text-gray-600 dark:text-gray-300 mb-2"
                >
                  {sourceContent}
                </Paragraph>
              )}
              
              {/* 如果item.content是数组且有内容，显示详细信息 */}
              {Array.isArray(item.content) && item.content.length > 0 && (
                <div className={sourceContent ? "mt-2 pt-2 border-t border-gray-100 dark:border-gray-700" : ""}>
                  {item.content.map((contentItem, index) => (
                    <div key={index} className="mb-3">
                      {Object.entries(contentItem).map(([key, value]) => (
                        <div key={key} className="mb-1">
                          <Text strong className="text-xs text-gray-700 dark:text-gray-300">{key}: </Text>
                          <Text className="text-xs">{String(value)}</Text>
                        </div>
                      ))}
                      {index < item.content.length - 1 && <Divider className="my-2" />}
                    </div>
                  ))}
                </div>
              )}
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default SearchResults; 