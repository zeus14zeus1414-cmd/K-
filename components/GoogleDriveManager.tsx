import React from 'react';
import { GoogleDriveIcon, InfoIcon, SpinnerIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';

export const GoogleDriveManager: React.FC = () => {
    const { googleDrive } = useAppContext();
    const { isSignedIn, user, signIn, signOut, isApiLoaded, driveError } = googleDrive;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">☁️ مزامنة Google Drive</h2>
            <div className="bg-dark-bg p-5 rounded-2xl border border-dark-border">
                {isApiLoaded ? (
                    <>
                        {isSignedIn && user ? (
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <img src={user.picture} alt={user.name} className="h-10 w-10 rounded-full" />
                                    <div>
                                        <p className="font-semibold">{user.name}</p>
                                        <p className="text-xs text-dark-text/60">{user.email}</p>
                                    </div>
                                </div>
                                <button onClick={signOut} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 font-semibold py-2 px-4 rounded-lg transition">
                                    قطع الاتصال
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                     <div className="h-10 w-10 rounded-full bg-dark-card flex items-center justify-center">
                                         <GoogleDriveIcon className="h-6 w-6" />
                                     </div>
                                     <div>
                                        <h3 className="font-bold text-lg">حفظ في Google Drive</h3>
                                        <p className="text-sm text-dark-text/70">
                                            احفظ محفوظاتك مباشرة في حسابك.
                                        </p>
                                    </div>
                                </div>
                                <button onClick={signIn} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg transition">
                                    ربط الحساب
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                     <div className="flex items-center gap-3 text-dark-text/70">
                         <SpinnerIcon className="h-5 w-5" />
                         <p>جاري تهيئة خدمات Google...</p>
                     </div>
                )}
                
                {driveError && (
                    <div className="mt-4 bg-red-500/10 p-3 rounded-xl flex items-start gap-3 text-sm text-red-400">
                        <InfoIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <p>{driveError}</p>
                    </div>
                )}
            </div>
        </div>
    );
};