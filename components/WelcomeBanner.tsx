import React, { useEffect, useState } from 'react';
import './WelcomeBanner.css';

interface WelcomeBannerProps {
    userName: string;
    appName?: string;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
    userName,
    appName = "여행앱"
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation after component mounts
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className={`welcome-banner ${isVisible ? 'visible' : ''}`}>
            <div className="welcome-content">
                <div className="welcome-icon">✈️</div>
                <h2 className="welcome-message">
                    <span className="user-name">{userName}</span>님,{' '}
                    <span className="app-name">{appName}</span>에 오신 것을 환영합니다!
                </h2>
                <p className="welcome-subtitle">
                    소중한 여행의 순간들을 기록하고 공유해보세요
                </p>
            </div>
        </div>
    );
};
