#!/usr/bin/env python3
"""
Mock ACP Provider for testing
Simulates an ACP agent without actual AI processing
"""

import json
import sys
import time
import uuid
import random


def send_message(msg):
    """Send JSON message to stdout"""
    print(json.dumps(msg), flush=True)


def handle_initialize(request):
    """Handle initialize request"""
    return {
        "protocolVersion": "2025-03-26",
        "agentCapabilities": {
            "promptCapabilities": {
                "streaming": True,
                "image": False
            },
            "loadSession": True
        },
        "agentInfo": {
            "name": "mock-agent",
            "version": "0.1.0"
        }
    }


def handle_session_new(request):
    """Handle session/new request"""
    return {
        "sessionId": str(uuid.uuid4()),
        "modes": {},
        "models": {}
    }


def handle_session_list(request):
    """Handle session/list request"""
    return {
        "sessions": [
            {
                "sessionId": "mock-session-1",
                "cwd": "/home/user/workspace",
                "title": "Mock Session 1",
                "updatedAt": "2025-03-29T00:00:00Z"
            }
        ]
    }


def handle_session_prompt(request):
    """Handle session/prompt request"""
    session_id = request["params"]["sessionId"]
    prompt = request["params"]["prompt"][0]["text"]
    
    # Simulate streaming response
    words = [
        "Hello! ",
        "I ",
        "am ",
        "a ",
        "mock ",
        "agent. ",
        "You ",
        "said: ",
        "\"", prompt, "\""
    ]
    
    request_id = request["id"]
    
    # Send streaming chunks
    full_text = ""
    for word in words:
        full_text += word
        notification = {
            "jsonrpc": "2.0",
            "method": "sessionUpdate",
            "params": {
                "sessionId": session_id,
                "update": {
                    "sessionUpdate": "agent_message_chunk",
                    "chunk": word
                }
            }
        }
        send_message(notification)
        time.sleep(0.05)
    
    # Send final message with full content
    final_notification = {
        "jsonrpc": "2.0",
        "method": "sessionUpdate",
        "params": {
            "sessionId": session_id,
            "update": {
                "sessionUpdate": "agent_message",
                "content": full_text
            }
        }
    }
    send_message(final_notification)
    
    return {"stopReason": "end_turn"}


def main():
    """Main loop"""
    while True:
        try:
            line = input()
            if not line:
                continue
            
            request = json.loads(line)
            method = request.get("method", "")
            request_id = request.get("id")
            
            result = None
            
            if method == "initialize":
                result = handle_initialize(request)
            elif method == "session/new":
                result = handle_session_new(request)
            elif method == "session/list":
                result = handle_session_list(request)
            elif method == "session/prompt":
                result = handle_session_prompt(request)
            else:
                result = {}
            
            # Send response if it's a request (has id)
            if request_id is not None:
                response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": result
                }
                send_message(response)
                
        except EOFError:
            break
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
