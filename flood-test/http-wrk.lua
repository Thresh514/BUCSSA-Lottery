-- wrk HTTP 压力测试脚本
-- 测试 /api/submit-answer 接口

-- 生成随机用户邮箱
function generateEmail()
    local uuid = math.random(10000000, 99999999)
    return "user_" .. uuid .. "@gmail.com"
end

-- 生成随机答案
function generateAnswer()
    return math.random() < 0.5 and "A" or "B"
end

-- 设置请求方法
wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"

-- 生成请求体
function request()
    local email = generateEmail()
    local answer = generateAnswer()
    local body = string.format('{"userEmail":"%s","answer":"%s"}', email, answer)
    return wrk.format("POST", nil, nil, body)
end

-- 响应处理
function response(status, headers, body)
    if status ~= 200 then
        print("Error: " .. status .. " - " .. body)
    end
end
