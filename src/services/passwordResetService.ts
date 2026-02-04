// Password reset service using Admin API

export const requestPasswordReset = async (email: string): Promise<string> => {
  try {
    const apiUrl = import.meta.env.VITE_ADMIN_API_URL || '/api/admin-users';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'resetPassword',
        userData: { email },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || errorData.message || 'Failed to generate reset link');
    }

    const result = await response.json();
    return result.resetLink; // In production, this would be sent via email
  } catch (error: any) {
    console.error('Error requesting password reset:', error);
    throw new Error(error.message || 'Failed to request password reset');
  }
};

export const requestVerificationEmail = async (email: string): Promise<string> => {
  try {
    const apiUrl = import.meta.env.VITE_ADMIN_API_URL || '/api/admin-users';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sendVerificationEmail',
        userData: { email },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || errorData.message || 'Failed to generate verification link');
    }

    const result = await response.json();
    return result.verificationLink; // In production, this would be sent via email
  } catch (error: any) {
    console.error('Error requesting verification email:', error);
    throw new Error(error.message || 'Failed to request verification email');
  }
};
