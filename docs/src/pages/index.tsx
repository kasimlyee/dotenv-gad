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
          <img src="https://img.shields.io/npm/v/dotenv-gad" />
          <img src="https://img.shields.io/npm/dm/dotenv-gad" />
          <img src="https://img.shields.io/github/stars/kasimlyee/dotenv-gad?style=social" />
          <img src="https://img.shields.io/github/license/kasimlyee/dotenv-gad" />
        </div>

        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get Started
          </Link>

          <Link
            className="button button--outline button--lg"
            to="https://github.com/kasimlyee/dotenv-gad">
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">

          <div className="col col--4">
            <Heading as="h3">🔐 Type-Safe Env</Heading>
            <p>
              Strong typing and schema validation for environment variables.
              Catch config bugs before your app starts.
            </p>
          </div>

          <div className="col col--4">
            <Heading as="h3">🧩 Schema Composition</Heading>
            <p>
              Compose, reuse, and group environment schemas with support for
              defaults, environments, and namespaces.
            </p>
          </div>

          <div className="col col--4">
            <Heading as="h3">⚙️ Powerful CLI</Heading>
            <p>
              Validate, fix, sync, generate types, and auto-document your
              environment with simple CLI commands.
            </p>
          </div>

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
          <code>
{`npm install dotenv-gad`}
          </code>
        </pre>

        <pre>
          <code>
{`import { defineSchema, loadEnv } from "dotenv-gad";

const schema = defineSchema({
  PORT: { type: "number", default: 3000 },
  DATABASE_URL: { type: "string", required: true }
});

const env = loadEnv(schema);`}
          </code>
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
      description="Type-safe environment variable validation for Node.js and TypeScript">
      <HomepageHeader />
      <main>
        <Features />
        <QuickStart />
        <Community />
      </main>
    </Layout>
  );
}
