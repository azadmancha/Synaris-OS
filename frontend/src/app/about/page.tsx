'use client';

import { useEffect, useState } from 'react';

export default function AboutPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16">
      <a
        href="/"
        className="mb-8 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        ← Home
      </a>

      <div
        className={`transition-all duration-700 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-[#EDEDEE]">
          About Synaris
        </h1>

        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              What is Synaris?
            </h2>
            <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
              Synaris is an open-source AI Learning Operating System designed to develop thinkers,
              not answer-seekers. Unlike traditional AI tutors, Synaris diagnoses understanding,
              identifies misconceptions, adapts explanations, remembers learning patterns, and
              guides learners through first-principles thinking.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              The Philosophy
            </h2>
            <blockquote className="mt-2 border-l-2 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400">
              &ldquo;Concepts are permanent. Marks are temporary.&rdquo;
            </blockquote>
            <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
              Every design decision in Synaris answers one question: Does this improve thinking?
              Not — is it flashy? Is it viral? Does it give the fastest answer?
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              The Mission
            </h2>
            <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
              To make world-class education personalized, adaptive, and accessible to every
              learner — regardless of background, geography, or resources.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
