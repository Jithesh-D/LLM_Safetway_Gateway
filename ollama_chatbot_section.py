
import requests
import json

def chat_with_ollama(prompt, model="llama2"):
    """Send safe prompt to Ollama and get chatbot response"""
    try:
        response = requests.post('http://localhost:11434/api/generate', 
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            },
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json().get('response', 'No response received')
        else:
            return f"Error: Ollama returned status {response.status_code}"
            
    except requests.exceptions.ConnectionError:
        return "Error: Ollama not running. Start with: ollama serve"
    except Exception as e:
        return f"Error: {str(e)}"

def check_prompt_safety(prompt):
    """Check prompt safety using the gateway API"""
    try:
        response = requests.post('http://localhost:3001/analyze',
            json={"prompt": prompt},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            return data.get('result') == 'SAFE', data.get('llmResponse')
        return False, None
    except Exception as e:
        print(f"Error checking safety: {e}")
        return False, None

def safe_prompt_chatbot():
    """Interactive chatbot for safe prompts only"""
    print("🤖 SAFE PROMPT CHATBOT WITH OLLAMA")
    print("=" * 50)
    print("Enter 'quit' to exit\n")
    
    while True:
        user_prompt = input("You: ")
        
        if user_prompt.lower() in ['quit', 'exit', 'q']:
            print("👋 Goodbye!")
            break
            
        is_safe, llm_response = check_prompt_safety(user_prompt)
        
        if is_safe:
            if llm_response:
                print("✅ Prompt is SAFE - LLM Response:")
                print(f"🤖 Bot: {llm_response}\n")
            else:
                print("✅ Prompt is SAFE - Getting Ollama response...")
                ollama_response = chat_with_ollama(user_prompt)
                print(f"🤖 Bot: {ollama_response}\n")
        else:
            print("🚫 Prompt is UNSAFE - Blocked for security")
            print("🛡️ Please try a different, safer prompt.\n")

test_prompt = "What is machine learning?"
print(f"Testing: '{test_prompt}'")

is_safe, llm_response = check_prompt_safety(test_prompt)

if is_safe:
    if llm_response:
        print("✅ Safe prompt - LLM Response:")
        print(f"🤖 Response: {llm_response}")
    else:
        print("✅ Safe prompt - Getting Ollama response...")
        response = chat_with_ollama(test_prompt)
        print(f"🤖 Response: {response}")
else:
    print("🚫 Unsafe prompt - Blocked")
