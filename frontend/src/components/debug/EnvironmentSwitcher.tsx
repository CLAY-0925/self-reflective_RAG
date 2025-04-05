import React, { useState, useEffect } from 'react';
import { Environment, ApiVersion, getEnvironment, getApiVersion } from '../../utils/config';
import { envManager } from '../../utils/envManager';

const EnvironmentSwitcher: React.FC = () => {
  const [environment, setEnvironment] = useState<Environment>(getEnvironment());
  const [apiVersion, setApiVersion] = useState<ApiVersion>(getApiVersion());
  const [isProduction, setIsProduction] = useState<boolean>(process.env.NODE_ENV === 'production');

  useEffect(() => {
    // 在组件挂载时获取当前环境设置
    setEnvironment(envManager.getCurrentEnvironment());
    setApiVersion(envManager.getCurrentApiVersion());
  }, []);

  // 切换环境
  const handleEnvironmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEnv = e.target.value as Environment;
    setEnvironment(newEnv);
    envManager.setEnvironment(newEnv);
  };

  // 切换API版本
  const handleApiVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVersion = e.target.value as ApiVersion;
    setApiVersion(newVersion);
    envManager.setApiVersion(newVersion);
  };

  // 应用设置
  const handleApplySettings = () => {
    envManager.applySettings();
  };

  // 重置设置
  const handleResetSettings = () => {
    if (envManager.resetToDefault()) {
      setEnvironment(envManager.getCurrentEnvironment());
      setApiVersion(envManager.getCurrentApiVersion());
    }
  };

  // 如果是生产环境，不显示环境切换器
  if (isProduction) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-medium text-yellow-800 mb-2">环境设置</h3>
      <p className="text-sm text-yellow-600 mb-4">
        注意：此工具仅用于开发和测试目的，不会在生产环境中显示。
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-1">
            当前环境
          </label>
          <select
            id="environment"
            value={environment}
            onChange={handleEnvironmentChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="development">开发环境 (Development)</option>
            <option value="test">测试环境 (Test)</option>
            <option value="production">生产环境 (Production)</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="apiVersion" className="block text-sm font-medium text-gray-700 mb-1">
            API 版本
          </label>
          <select
            id="apiVersion"
            value={apiVersion}
            onChange={handleApiVersionChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="v1">V1</option>
            <option value="v2">V2</option>
          </select>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={handleApplySettings}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          应用设置并刷新
        </button>
        
        <button
          onClick={handleResetSettings}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          重置为默认设置
        </button>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>当前配置: 环境 = {environment}, API版本 = {apiVersion}</p>
      </div>
    </div>
  );
};

export default EnvironmentSwitcher; 