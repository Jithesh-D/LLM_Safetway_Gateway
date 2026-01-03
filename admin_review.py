#!/usr/bin/env python3
"""
Admin tool to review user prompts and approve safe ones
"""

import csv
import os

USER_PROMPTS_FILE = 'user_prompts.csv'
SAFE_PROMPTS_FILE = 'safe_prompts.csv'

def review_prompts():
    print("="*80)
    print("🔍 ADMIN REVIEW TOOL - User Prompt Approval")
    print("="*80)
    
    if not os.path.exists(USER_PROMPTS_FILE):
        print(f"\n❌ No user prompts file found: {USER_PROMPTS_FILE}")
        print("   Users need to submit prompts first!")
        return
    
    # Read user prompts
    with open(USER_PROMPTS_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        prompts = list(reader)
    
    if not prompts:
        print("\n✅ No new prompts to review!")
        return
    
    print(f"\n📋 Found {len(prompts)} prompt(s) to review\n")
    
    approved = []
    
    for idx, row in enumerate(prompts, 1):
        timestamp = row['timestamp']
        prompt = row['prompt']
        result = row['result']
        threat_score = row['threat_score']
        
        print(f"\n{'─'*80}")
        print(f"Prompt #{idx}/{len(prompts)}")
        print(f"{'─'*80}")
        print(f"Timestamp: {timestamp}")
        print(f"Prompt: \"{prompt}\"")
        print(f"Gateway Result: {result}")
        print(f"Threat Score: {threat_score}/100")
        
        # Auto-suggest based on result
        if result == 'SAFE' or result == 'SAFE_WHITELISTED':
            suggestion = "APPROVE (Gateway marked as safe)"
        else:
            suggestion = "REJECT (Gateway blocked this)"
        
        print(f"\n💡 Suggestion: {suggestion}")
        
        # Get admin decision
        while True:
            decision = input("\n👤 Your decision [A]pprove / [R]eject / [S]kip: ").strip().upper()
            
            if decision in ['A', 'APPROVE']:
                approved.append(prompt)
                print(f"   ✅ Approved - will be added to whitelist")
                break
            elif decision in ['R', 'REJECT']:
                print(f"   ❌ Rejected - will not be whitelisted")
                break
            elif decision in ['S', 'SKIP']:
                print(f"   ⏭️  Skipped - will review later")
                break
            else:
                print(f"   ⚠️  Invalid input. Use A, R, or S")
    
    # Add approved prompts to safe_prompts.csv
    if approved:
        print(f"\n{'='*80}")
        print(f"📝 Adding {len(approved)} approved prompt(s) to whitelist...")
        print(f"{'='*80}")
        
        with open(SAFE_PROMPTS_FILE, 'a', encoding='utf-8') as f:
            for prompt in approved:
                # Format: "prompt text",0
                escaped_prompt = prompt.replace('"', '""')
                f.write(f'"{escaped_prompt}",0\n')
                print(f"   ✅ Added: \"{prompt[:60]}...\"")
        
        print(f"\n✅ Whitelist updated! Restart server to reload.")
        print(f"   Command: npm run server")
    else:
        print(f"\n⚠️  No prompts approved")
    
    # Ask to clear user_prompts.csv
    print(f"\n{'='*80}")
    clear = input("🗑️  Clear reviewed prompts from log? [Y/n]: ").strip().upper()
    
    if clear != 'N':
        # Keep header, clear data
        with open(USER_PROMPTS_FILE, 'w', encoding='utf-8') as f:
            f.write('timestamp,prompt,result,threat_score\n')
        print("   ✅ User prompts log cleared")
    else:
        print("   ℹ️  Log kept for records")
    
    print(f"\n{'='*80}")
    print("✅ REVIEW COMPLETE")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    try:
        review_prompts()
    except KeyboardInterrupt:
        print("\n\n⚠️  Review cancelled by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
