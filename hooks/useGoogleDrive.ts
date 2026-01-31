import { useState, useEffect, useCallback, useRef } from 'react';
import { GOOGLE_API_KEY, GOOGLE_CLIENT_ID } from '../constants';
import { GoogleUser } from '../types';

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

export const useGoogleDrive = () => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isApiLoaded, setIsApiLoaded] = useState(false);
    const [driveError, setDriveError] = useState<string | null>(null);
    const tokenClientRef = useRef<any>(null);
    const userInitiatedSignIn = useRef(false); // Ref to track user action

    // Internal function to clear session state without revoking tokens
    const signOutInternal = useCallback(() => {
        setIsSignedIn(false);
        setUser(null);
        localStorage.removeItem('googleUser');
        if (window.gapi?.client) {
            window.gapi.client.setToken(null);
        }
    }, []);

    // This callback is triggered when GIS provides a token. It's the single source of truth.
    const onTokenResponse = useCallback(async (tokenResponse: any) => {
        userInitiatedSignIn.current = false; // Reset on any token response
        if (tokenResponse && tokenResponse.access_token) {
            // Sync token with the older GAPI library
            window.gapi.client.setToken(tokenResponse);
            setIsSignedIn(true);
            setDriveError(null); // Clear errors on success

            // Fetch user profile info now that we are authorized
            try {
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                });
                if (!userInfoResponse.ok) throw new Error('Failed to fetch user info');
                
                const profile = await userInfoResponse.json();
                const googleUser = { name: profile.name, email: profile.email, picture: profile.picture };
                setUser(googleUser);
                localStorage.setItem('googleUser', JSON.stringify(googleUser));
            } catch (e) {
                console.error("Failed to fetch user info after getting token:", e);
                // Sign out if user info fails, as state is inconsistent
                signOutInternal();
            }
        } else {
            // Handle failed token acquisition
            console.warn("Failed to get access token:", tokenResponse);
            signOutInternal();
        }
    }, [signOutInternal]);
    
    // Main initialization effect
    useEffect(() => {
        // Optimistically set user state from localStorage for instant UI update on refresh
        const storedUserRaw = localStorage.getItem('googleUser');
        if (storedUserRaw) {
            try {
                const storedUser = JSON.parse(storedUserRaw);
                setUser(storedUser);
                setIsSignedIn(true);
            } catch (e) {
                localStorage.removeItem('googleUser');
            }
        }

        const areKeysPlaceholders = !GOOGLE_API_KEY || GOOGLE_API_KEY.includes("AIza") === false || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_ID.includes("apps.googleusercontent.com");
        if (areKeysPlaceholders) {
            const errorMessage = "فشلت تهيئة Google Drive. بيانات اعتماد API غير مهيأة. يرجى استبدال القيم النائبة في ملف 'constants.ts' لتفعيل هذه الميزة.";
            setDriveError(errorMessage);
            setIsApiLoaded(false);
            return;
        }
        
        const gapiLoaded = () => {
             window.gapi.load('client', () => {
                window.gapi.client.init({
                    apiKey: GOOGLE_API_KEY,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                }).then(() => {
                    setIsApiLoaded(true);
                    setDriveError(null);
                     // If user was signed in previously, try to restore the session silently.
                    if (localStorage.getItem('googleUser') && tokenClientRef.current) {
                        tokenClientRef.current.requestAccessToken({ prompt: 'none' });
                    }
                }).catch((err: any) => {
                    console.error("Error initializing gapi client:", err);
                    const errorMessage = "فشلت تهيئة Google Drive. قد تكون هناك مشكلة في إعدادات النشر الخاصة بـ OAuth Client ID. تأكد من أن المشروع في وضع 'Production'.";
                    setDriveError(errorMessage);
                    setIsApiLoaded(false);
                });
            });
        };

        const gisLoaded = () => {
            tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
                callback: onTokenResponse,
                error_callback: (error: any) => {
                     console.error("Google Auth Error:", error);
                     if (userInitiatedSignIn.current) {
                         if (error && error.type === 'popup_closed') {
                            setDriveError("تم إغلاق نافذة المصادقة. يرجى المحاولة مرة أخرى.");
                         } else if (error && error.type === 'token_request_failed') {
                            setDriveError("فشل طلب المصادقة. تحقق من اتصالك بالإنترنت أو إعدادات المتصفح.");
                         }
                     } else {
                        // This was a silent refresh attempt that failed. Clean up optimistic state.
                        signOutInternal();
                     }
                     userInitiatedSignIn.current = false; // Reset after any error
                }
            });
            
            gapiLoaded();
        };

        const intervalId = setInterval(() => {
            if (window.gapi && window.google) {
                clearInterval(intervalId);
                gisLoaded();
            }
        }, 100);

        return () => clearInterval(intervalId);
    }, [onTokenResponse, signOutInternal]);


    const signIn = () => {
        if (!isApiLoaded || !tokenClientRef.current) {
            console.error("Google Auth client has not been initialized.");
            setDriveError("خدمات Google ليست جاهزة بعد، يرجى المحاولة بعد لحظات.");
            return;
        }
        setDriveError(null); // Clear previous errors on new attempt
        userInitiatedSignIn.current = true; // Set flag to indicate user action

        // Trigger the OAuth 2.0 flow. This will handle sign-in and consent.
        tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    };

    const signOut = () => {
        const token = window.gapi?.client?.getToken();
        if (token?.access_token && window.google?.accounts?.oauth2?.revoke) {
            window.google.accounts.oauth2.revoke(token.access_token, () => {
                console.log('Token revoked from Google.');
            });
        }
        signOutInternal();
    };

    const saveFile = async (blob: Blob, fileName: string, mimeType: string): Promise<any> => {
        if (!isSignedIn || !isApiLoaded) {
            throw new Error("يرجى ربط حساب Google Drive أولاً.");
        }
        
        const token = window.gapi.client.getToken();
        if (!token?.access_token) {
            signIn();
            throw new Error("انتهت صلاحية جلسة Google Drive. يرجى إعادة ربط حسابك.");
        }

        const metadata = { name: fileName, mimeType: mimeType };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({ 'Authorization': `Bearer ${token.access_token}` }),
            body: form,
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Google Drive API Error:", error);
            if (response.status === 401) {
                 signOut(); 
                 throw new Error(`فشل التحقق من الهوية مع Google Drive. تم تسجيل خروجك. يرجى إعادة ربط حسابك.`);
            }
            throw new Error(`فشل رفع الملف: ${error.error?.message || 'خطأ غير معروف'}`);
        }

        return response.json();
    };

    return { isSignedIn, user, signIn, signOut, saveFile, isApiLoaded, driveError };
};