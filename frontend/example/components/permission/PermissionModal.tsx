'use client';

import React from 'react';
import { usePermission } from '@/contexts/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Shield, X } from 'lucide-react';
import { formatJson } from '@/utils/helpers';

export function PermissionModal() {
  const { pendingRequests, respondToPermission, dismissPermission } = usePermission();
  
  if (pendingRequests.length === 0) {
    return null;
  }

  const request = pendingRequests[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel max-w-lg w-full animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-400/20 
                            border border-yellow-400/30 flex items-center justify-center shadow-lg shadow-yellow-400/20">
              <Shield size={24} className="text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">
                Permission Request
              </h3>
              <p className="text-sm text-slate-400">
                {pendingRequests.length > 1 && `${pendingRequests.length - 1} more pending`}
              </p>
            </div>
          </div>
          <button
            onClick={() => dismissPermission(request.id)}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-slate-300 mb-4">
            The AI assistant requests to perform the following action:
          </p>
          
          <div className="glass-card p-4 mb-4">
            <h4 className="text-sm font-medium text-blue-400 mb-2">
              {request.toolName}
            </h4>
            {request.arguments && Object.keys(request.arguments).length > 0 && (
              <pre className="text-xs bg-black/30 p-3 rounded-lg overflow-x-auto border border-white/5">
                <code className="text-slate-400">
                  {formatJson(request.arguments)}
                </code>
              </pre>
            )}
          </div>

          <p className="text-sm text-slate-400">
            Choose how to handle this request:
          </p>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-white/10 space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => respondToPermission(request.id, 'allow_once')}
            >
              Allow Once
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => respondToPermission(request.id, 'allow_session')}
            >
              Always Allow
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => respondToPermission(request.id, 'deny_once')}
            >
              Deny Once
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => respondToPermission(request.id, 'deny_session')}
            >
              Always Deny
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
