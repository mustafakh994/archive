#!/bin/bash
# Fix Next.js chunk hash mismatches

cd /www/forms_front/.next/static/chunks

# Map of current hashes to expected hashes
declare -A chunk_map=(
    ["9239-0bbb4c8d5cc89d29.js"]="9239-261447ac13662283.js"
    ["229-fff65b2d23816ee6.js"]="229-7eb06983700587e8.js"
    ["app/login/page-825c820d7c208b38.js"]="app/login/page-b9939a63d99b011b.js"
    ["app/page-bd8e093d7edc6d76.js"]="app/page-de9d01724e3486c1.js"
    ["app/(dashboard)/forms/page-8c3a0909636554aa.js"]="app/(dashboard)/forms/page-8c3a0909636554aa.js"
)

for current_hash in "${!chunk_map[@]}"; do
    expected_hash="${chunk_map[$current_hash]}"
    
    if [ -f "$current_hash" ]; then
        if [ "$current_hash" != "$expected_hash" ]; then
            # Create symlink or copy
            if [ -f "$expected_hash" ]; then
                rm -f "$current_hash"
            else
                mv -f "$current_hash" "$expected_hash" 2>/dev/null
            fi
            
            # Create symlink from current to expected
            ln -sf "$(basename "$expected_hash")" "$current_hash" 2>/dev/null || true
        fi
    fi
done

echo "Chunks fixed"
