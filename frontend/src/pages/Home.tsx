import React from 'react';
import { motion } from 'framer-motion';
import { Hero } from '@/components/home/Hero';
import { FeaturedCourses } from '@/components/home/FeaturedCourses';
import { StatsCounter } from '@/components/home/StatsCounter';
import { Testimonials } from '@/components/home/Testimonials';
import { FAQ } from '@/components/home/FAQ';
import { Newsletter } from '@/components/home/Newsletter';
import SEO from '@/components/seo/SEO';

export default function Home() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <SEO title="Home" />
      <Hero />
      <FeaturedCourses />
      <StatsCounter />
      <Testimonials />
      <FAQ />
      <Newsletter />
    </motion.div>
  );
}
