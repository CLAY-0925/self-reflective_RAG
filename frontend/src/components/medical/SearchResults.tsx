import React from 'react';
import { Card, List, Typography, Empty, Divider } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useChat } from '../../context/ChatContext';

const { Paragraph, Link, Text } = Typography;

// Function to safely get object properties
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
    console.error('Failed to get property:', error);
    return defaultValue;
  }
};

// Try to get hostname from URL, return original link if failed
const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    console.error('Failed to parse URL:', error);
    return url;
  }
};

// Clean title text, remove "Title:" prefix
const cleanTitle = (title: string): string => {
  if (typeof title !== 'string') return 'Unknown Title';
  return title.replace(/^Title:/, '').trim();
};

const SearchResults: React.FC = () => {
  const { searchResults } = useChat();
  
  // Ensure searchResults is an array
  const resultsArray = Array.isArray(searchResults) ? searchResults : [];
  
  // Filter out potentially problematic results
  const validResults = resultsArray.filter(item => {
    return (
      item && 
      typeof item === 'object' && 
      (
        // Check item.title
        (typeof safeGet(item, 'title') === 'string') ||
        // Or check source.tittle/source.title
        (item.source && 
         (typeof safeGet(item, 'source.tittle') === 'string' || 
          typeof safeGet(item, 'source.title') === 'string'))
      )
    );
  });
  
  if (!validResults || validResults.length === 0) {
    return (
      <Card title="Online Search Results" className="mb-4">
        <Empty 
          description="No search results" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        />
      </Card>
    );
  }
  
  return (
    <Card title="Online Search Results" className="mb-4">
      <List
        itemLayout="vertical"
        dataSource={validResults}
        renderItem={(item) => {
          // Process title field
          const itemTitle = safeGet(item, 'title', '');
          
          // Process source field
          const source = item.source || {};
          const sourceTitleRaw = safeGet(source, 'tittle', safeGet(source, 'title', ''));
          const sourceTitle = cleanTitle(sourceTitleRaw);
          const sourceContent = safeGet(source, 'content', '');
          const sourceLink = safeGet(source, 'link', '#');
          
          // Use best available title
          const displayTitle = cleanTitle(itemTitle || sourceTitle);
          
          return (
            <List.Item
              key={displayTitle || Math.random().toString()}
              className="border-b last:border-0 pb-4"
            >
              {/* Title and Link */}
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
              
              {/* Content Summary */}
              {sourceContent && (
                <Paragraph 
                  ellipsis={{ rows: 3, expandable: true, symbol: 'Expand' }}
                  className="text-sm text-gray-600 dark:text-gray-300 mb-2"
                >
                  {sourceContent}
                </Paragraph>
              )}
              
              {/* If item.content is array and has content, show detailed information */}
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