import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function BlurText({
  text = '',
  className = '',
  delay = 0.06,
  animateBy = 'words', // 'words' or 'letters'
  as: Component = 'span',
  ...props
}) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const elements = animateBy === 'words' ? text.split(' ') : text.split('');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      filter: reducedMotion ? 'none' : 'blur(8px)',
      y: reducedMotion ? 0 : 8,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        duration: reducedMotion ? 0.01 : 0.45,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <Component className={`inline-flex flex-wrap ${className}`} {...props}>
      <motion.span
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="inline-flex flex-wrap gap-x-[0.28em]"
      >
        {elements.map((el, i) => (
          <motion.span
            key={i}
            variants={itemVariants}
            className="inline-block"
          >
            {el === ' ' ? '\u00A0' : el}
          </motion.span>
        ))}
      </motion.span>
    </Component>
  );
}
