// Utility to check if the backend API is accessible
export async function checkApiHealth(): Promise<{
  isHealthy: boolean
  message: string
  url: string
}> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.forms.hamaprov.net'
  
  try {
    const response = await fetch(`${apiUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (response.ok) {
      return {
        isHealthy: true,
        message: 'Backend API is accessible',
        url: apiUrl
      }
    } else {
      return {
        isHealthy: false,
        message: `Backend API returned status ${response.status}`,
        url: apiUrl
      }
    }
  } catch (error) {
    return {
      isHealthy: false,
      message: `Cannot connect to backend API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url: apiUrl
    }
  }
}

// Test login endpoint specifically
export async function testLoginEndpoint(credentials: { email: string; password: string }): Promise<{
  success: boolean
  message: string
  data?: any
}> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.forms.hamaprov.net'
  
  try {
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })
    
    const data = await response.json()
    
    return {
      success: response.ok,
      message: data.message || `HTTP ${response.status}`,
      data: response.ok ? data : null
    }
  } catch (error) {
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}