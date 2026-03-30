'use client';

import React from 'react';
import { usePermission } from '@/contexts/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Shield, X } from 'lucide-react';
import { formatJson } from '@/utils/helpers';

export function PermissionModal() {
  const { pendingRequests, respondToPermission, dismissPermission } = usePermission();
  
  // Debug logs

  if (pendingRequests.length === 0) {
    return null;
  }

  // Only show the earliest request
  const request = pendingRequests[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-github-surface border border-github-border rounded-lg max-w-lg w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-github-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Shield size={20} className="text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold text-github-text-primary">
                Permission Request
              </h3>
              <p className="text-sm text-github-muted">
                {pendingRequests.length > 1 && `${pendingRequests.length - 1} pending requests remaining`}
              </p>
            </div>
          </div>
          <button
            onClick={() => dismissPermission(request.id)}
            className="p-2 rounded-lg hover:bg-github-surface-hover text-github-muted"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-github-text mb-4">
            AI assistant is requesting to perform the following action:
          </p>
          
          <div className="bg-github-bg border border-github-border rounded-lg p-3 mb-4">
            <h4 className="text-sm font-medium text-github-accent mb-2">
              {request.toolName}
            </h4>
            {request.arguments && Object.keys(request.arguments).length > 0 && (
              <pre className="text-xs bg-github-surface p-2 rounded overflow-x-auto">
                <code className="text-github-muted">
                  {formatJson(request.arguments)}
                </code>
              </pre>
            )}
          </div>

          <p className="text-sm text-github-muted mb-4">
            Please choose how to handle this request:
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-github-border space-y-2">
          <div className="grid grid-cols-2 gap-2">
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
              Always Allow (This Session)
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
              Always Deny (This Session)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
