import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import Contributors from '@site/src/components/Contributors';
import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">

        <Heading as="h1" className="hero__title">
          dotenv-gad
        </Heading>

        <p className="hero__subtitle">
          Type-safe environment variable validation for Node.js & TypeScript
        </p>

        {/* Badges */}
        <div className={styles.badges}>
          <img src="https://img.shields.io/npm/v/dotenv-gad" alt="npm version" />
          <img src="https://img.shields.io/npm/dm/dotenv-gad" alt="npm downloads" />
          <img
            src="https://img.shields.io/github/stars/kasimlyee/dotenv-gad?style=social"
            alt="GitHub stars"
          />
          <img
            src="https://img.shields.io/github/license/kasimlyee/dotenv-gad"
            alt="License"
          />
        </div>

        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

function FeatureItem({ iconSvg, title, description }) {
  return (
    <div className="col col--4">
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        {iconSvg}
      </div>
      <Heading as="h3">{title}</Heading>
      <p>{description}</p>
    </div>
  );
}

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <FeatureItem
            iconSvg={
              <svg
                viewBox="0 0 24 24"
                fill="#f97316"
                width="48"
                height="48"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            }
            title="Type-Safe Env"
            description="Strong typing and schema validation for environment variables. Catch config bugs before your app starts."
          />

          <FeatureItem
            iconSvg={
              <svg
                viewBox="0 0 24 24"
                fill="#f97316"
                width="48"
                height="48"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm10 15H5v-2h14v2zm0-4H5V9h2.08C7.03 9.33 7 9.66 7 10c0 1.66 1.34 3 3 3s3-1.34 3-3c0-.34-.03-.67-.08-1H19v6z" />
              </svg>
            }
            title="Schema Composition"
            description="Compose, reuse, and group environment schemas with support for defaults, environments, and namespaces."
          />

          <FeatureItem
            iconSvg={
              <svg
                viewBox="0 0 24 24"
                fill="#f97316"
                width="48"
                height="48"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            }
            title="Powerful CLI"
            description="Validate, fix, sync, generate types, and auto-document your environment with simple CLI commands."
          />
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section className={styles.quickstart}>
      <div className="container">
        <Heading as="h2">Quick Start</Heading>

        <pre>
          <code>{`npm install dotenv-gad`}</code>
        </pre>

        <pre>
          <code>{`import { defineSchema, loadEnv } from "dotenv-gad";

const schema = defineSchema({
  PORT: { type: "number", default: 3000 },
  DATABASE_URL: { type: "string", required: true }
});

const env = loadEnv(schema);`}</code>
        </pre>

        <Link className="button button--primary" to="/docs/intro">
          Read Documentation →
        </Link>
      </div>
    </section>
  );
}

function Community() {
  return (
    <section className={styles.community}>
      <div className="container">
        <Heading as="h2">Community & Contributors</Heading>
        <p>
          dotenv-gad is open source and community-driven.
          Contributions, issues, and discussions are welcome.
        </p>

        <Contributors />
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title="dotenv-gad"
      description="Type-safe environment variable validation for Node.js and TypeScript"
    >
      <HomepageHeader />
      <main>
        <Features />
        <QuickStart />
        <Community />
      </main>
    </Layout>
  );
}