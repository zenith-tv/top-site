'use client';

import React, { useEffect } from 'react';

export const RippleEffect = () => {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const ripple = document.createElement('div');
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      
      ripple.style.width = ripple.style.height = `${size}px`;
      
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      
      ripple.classList.add('ripple');
      
      const container = document.getElementById('ripple-container');
      if (container) {
        container.appendChild(ripple);
      }

      ripple.addEventListener('animationend', () => {
        ripple.remove();
      });
    };

    const body = document.body;
    let container = document.getElementById('ripple-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ripple-container';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.overflow = 'hidden';
      container.style.zIndex = '-1'; 
      body.prepend(container);
    }

    body.addEventListener('click', handleClick);

    return () => {
      body.removeEventListener('click', handleClick);
    };
  }, []);

  return null;
};
