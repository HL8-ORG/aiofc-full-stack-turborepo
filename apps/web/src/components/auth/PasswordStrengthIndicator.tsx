'use client';

import React, { useState, useEffect } from 'react';
import { PasswordValidator } from '@repo/auth';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export default function PasswordStrengthIndicator({
  password,
  className = ""
}: PasswordStrengthIndicatorProps) {
  const [strengthData, setStrengthData] = useState<any>(null);

  useEffect(() => {
    if (password) {
      const data = PasswordValidator.validateStrength(password);
      setStrengthData(data);
    } else {
      setStrengthData(null);
    }
  }, [password]);

  if (!strengthData) return null;

  const getProgressColor = () => {
    switch (strengthData.strength) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getProgressWidth = () => {
    return `${(strengthData.score / 5) * 100}%`;
  };

  return (
    <div className={`mt-2 ${className}`}>
      {/* 进度条 */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: getProgressWidth() }}
        />
      </div>

      {/* 强度文本 */}
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm text-gray-600">密码强度:</span>
        <span className={`text-sm font-medium ${PasswordValidator.getStrengthColor(strengthData.strength)}`}>
          {PasswordValidator.getStrengthText(strengthData.strength)}
        </span>
      </div>

      {/* 检查列表 */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${strengthData.checks.length ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={`text-xs ${strengthData.checks.length ? 'text-green-600' : 'text-gray-500'}`}>
            8个字符以上
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${strengthData.checks.lowercase ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={`text-xs ${strengthData.checks.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
            包含小写字母
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${strengthData.checks.uppercase ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={`text-xs ${strengthData.checks.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
            包含大写字母
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${strengthData.checks.numbers ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={`text-xs ${strengthData.checks.numbers ? 'text-green-600' : 'text-gray-500'}`}>
            包含数字
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${strengthData.checks.symbols ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className={`text-xs ${strengthData.checks.symbols ? 'text-green-600' : 'text-gray-500'}`}>
            包含特殊字符
          </span>
        </div>
      </div>

      {/* 建议 */}
      {strengthData.suggestions.length > 0 && (
        <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
          <p className="text-xs text-yellow-800 font-medium mb-1">改进建议:</p>
          <ul className="text-xs text-yellow-700 space-y-1">
            {strengthData.suggestions.map((suggestion: string, index: number) => (
              <li key={index}>• {suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
