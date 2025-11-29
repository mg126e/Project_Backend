# Test script for Email Verification API
# Usage: .\test_email_verification.ps1

$baseUrl = "http://localhost:8000/api"
$testEmail = "mg126@wellesley.edu"

Write-Host "🧪 Testing Email Verification API" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Request verification code
Write-Host "📧 Test 1: Requesting verification code for $testEmail" -ForegroundColor Yellow
$body = @{
    userId = "test-user-123"
    email = $testEmail
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/EmailVerification/requestVerification" `
        -Method POST `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Gray
    $response | ConvertTo-Json -Depth 3
    
    if ($response.verificationRecordId -and $response.verificationCode) {
        Write-Host ""
        Write-Host "📝 Verification Code: $($response.verificationCode)" -ForegroundColor Cyan
        Write-Host "📝 Record ID: $($response.verificationRecordId)" -ForegroundColor Cyan
        
        # Test 2: Verify the code
        Write-Host ""
        Write-Host "🔐 Test 2: Verifying the code" -ForegroundColor Yellow
        $verifyBody = @{
            verificationRecordId = $response.verificationRecordId
            verificationCode = $response.verificationCode
        } | ConvertTo-Json
        
        try {
            $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/EmailVerification/verifyEmail" `
                -Method POST `
                -Body $verifyBody `
                -ContentType "application/json"
            
            Write-Host "✅ Verification successful!" -ForegroundColor Green
            Write-Host "Response:" -ForegroundColor Gray
            $verifyResponse | ConvertTo-Json -Depth 3
        }
        catch {
            Write-Host "❌ Verification failed:" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
    }
}
catch {
    Write-Host "❌ Request failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Test completed!" -ForegroundColor Cyan
