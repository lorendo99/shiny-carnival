import { repairGuides } from '../data/repairGuides';
import { routeMetadata } from './seo';

export type SeoPrerenderPage = {
  path: string;
  title: string;
  description: string;
  noindex: boolean;
  content: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function documentContent(path: string) {
  const content: Record<string, string> = {
    '/': `
      <main id="main-content">
        <section>
          <p>FixMate · UK home repair guidance</p>
          <h1>Home repair guidance for UK households</h1>
          <p>When an appliance breaks, FixMate helps you understand likely faults, check safety, estimate UK repair costs, and choose a practical next step.</p>
        </section>
        <section>
          <h2>How FixMate helps</h2>
          <ol>
            <li>Describe what has stopped working and share relevant evidence.</li>
            <li>Review cautious, plain-English guidance, likely causes, and safety notes.</li>
            <li>Prepare a repair job and compare itemised quotes from local repairers.</li>
          </ol>
        </section>
        <section>
          <h2>Common appliance repair guides</h2>
          <ul>${repairGuides.map((guide) => `<li><a href="/repair-guides/${escapeHtml(guide.slug)}">${escapeHtml(guide.heading)}</a></li>`).join('')}</ul>
        </section>
        <nav aria-label="More about FixMate">
          <a href="/about">About FixMate</a> ·
          <a href="/demo">See a repair guidance demo</a> ·
          <a href="/help">Get help</a> ·
          <a href="/contact">Contact</a>
        </nav>
      </main>
    `,
    '/about': `
      <main id="main-content">
        <h1>The camera-first repair assistant</h1>
        <p>FixMate helps UK households make sense of a broken appliance before deciding what to do next. Add a description and, when useful, a photo or short video to organise the repair clues.</p>
        <h2>From repair clues to a practical next step</h2>
        <p>FixMate provides plain-English guidance about likely causes, safety considerations, and typical UK repair costs. When professional help is needed, you can prepare a repair job and compare itemised quotes.</p>
        <p>Guidance is not a substitute for an inspection by a qualified repair professional. For urgent hazards, stop using the appliance and seek appropriate help.</p>
        <p><a href="/">Explore FixMate repair guidance</a> · <a href="/repair-guides/dishwasher-not-draining">Browse a repair guide</a></p>
      </main>
    `,
    '/demo': `
      <main id="main-content">
        <h1>See how FixMate turns a repair problem into a safer next step.</h1>
        <p>This sample shows how FixMate organises a household repair description into possible causes, safety guidance, and practical next steps. It is an example, not a professional inspection or a live diagnosis.</p>
        <h2>What a repair guidance result can include</h2>
        <ul><li>Likely causes to discuss with a repair professional</li><li>Safety steps to take before inspecting an appliance</li><li>A typical UK repair cost range, where available</li></ul>
        <p><a href="/">Return to FixMate</a> · <a href="/help">Read the help center</a></p>
      </main>
    `,
    '/help': `
      <main id="main-content">
        <h1>How can we help?</h1>
        <p>Find support for FixMate repair guidance, safety information, repair evidence, private reports, and quotes from local repairers.</p>
        <h2>Is a FixMate diagnosis a professional inspection?</h2>
        <p>No. FixMate offers guidance to help you organise the symptoms and consider safe next steps. A qualified professional should inspect and repair faults that need specialist work.</p>
        <h2>Are repair cost estimates final quotes?</h2>
        <p>No. Estimates are an initial guide. A repairer provides the final quote after reviewing the job and any relevant evidence.</p>
        <h2>How do I get more help?</h2>
        <p><a href="/contact">Contact FixMate support</a> or review the <a href="/privacy">privacy information</a>.</p>
      </main>
    `,
    '/contact': `
      <main id="main-content">
        <h1>We're here to help.</h1>
        <p>Contact FixMate about account support, repair guidance, privacy concerns, or a marketplace issue.</p>
        <h2>Choose the right support topic</h2>
        <ul><li>For account access, include the email used for your FixMate account.</li><li>For a repair question, describe the appliance and the issue without sharing unnecessary personal details.</li><li>For a privacy concern, tell us which report or evidence you are asking about.</li></ul>
        <p><a href="/help">Visit the FixMate help center</a> · <a href="/privacy">Read the privacy information</a></p>
      </main>
    `,
    '/privacy': `
      <main id="main-content">
        <h1>Your data, clearly explained.</h1>
        <p>FixMate explains how account details, repair descriptions, uploaded evidence, reports, and marketplace conversations are handled.</p>
        <h2>Repair evidence and shared reports</h2>
        <p>Only add photos or videos that are relevant to the repair. A report is shared with a repairer only when you choose to share it; check the full privacy information for details about access, retention, and account controls.</p>
        <h2>Questions or account requests</h2>
        <p><a href="/contact">Contact FixMate about a privacy question</a> or visit the <a href="/help">help center</a>.</p>
      </main>
    `,
    '/terms': `
      <main id="main-content">
        <h1>Clear terms for using FixMate.</h1>
        <p>These terms explain what FixMate provides, what it does not promise, and how the repair marketplace works.</p>
        <h2>Repair guidance</h2>
        <p>FixMate offers informational guidance to help organise repair symptoms and possible next steps. It does not replace an in-person assessment by a qualified professional, and estimates are not final repair quotes.</p>
        <h2>Quotes and repair work</h2>
        <p>Repairers provide their own quotes and carry out any work they agree with you. Review the complete terms before using the marketplace.</p>
        <p><a href="/contact">Contact FixMate</a> · <a href="/privacy">Read the privacy information</a></p>
      </main>
    `,
    '/app': `
      <main id="main-content"><h1>Start a repair diagnosis</h1><p>Describe the household repair problem and add relevant evidence to get cautious next-step guidance from FixMate.</p><p><a href="/">Return to FixMate home</a></p></main>
    `,
    '/marketplace': `
      <main id="main-content"><h1>Find a local repairer</h1><p>Prepare a repair job, review itemised quotes, and keep repair conversations organised with FixMate.</p><p><a href="/">Return to FixMate home</a></p></main>
    `,
    '/inventory': `
      <main id="main-content"><h1>Your repair inventory</h1><p>Your saved diagnoses and repair reports are private to your FixMate account.</p><p><a href="/sign-in">Sign in to FixMate</a></p></main>
    `,
    '/sign-in': `
      <main id="main-content"><h1>Sign in to FixMate</h1><p>Sign in to manage saved diagnoses, repair evidence, and private reports.</p><p><a href="/sign-up">Create a FixMate account</a></p></main>
    `,
    '/sign-up': `
      <main id="main-content"><h1>Create your FixMate account</h1><p>Save repair diagnoses, upload evidence, and prepare private repair reports with FixMate.</p><p><a href="/sign-in">Already have an account? Sign in</a></p></main>
    `,
  };

  if (content[path]) return content[path];

  const guide = path.startsWith('/repair-guides/')
    ? repairGuides.find((candidate) => path === `/repair-guides/${candidate.slug}`)
    : undefined;
  if (!guide) return null;

  return `
    <main id="main-content">
      <nav aria-label="Breadcrumb"><a href="/">FixMate</a> / <a href="/repair-guides/dishwasher-not-draining">Repair guides</a> / ${escapeHtml(guide.itemType)}</nav>
      <article>
        <p>${escapeHtml(guide.eyebrow)}</p>
        <h1>${escapeHtml(guide.heading)}</h1>
        <p>${escapeHtml(guide.intro)}</p>
        <h2>Possible causes</h2>
        <ul>${guide.causes.map((cause) => `<li>${escapeHtml(cause)}</li>`).join('')}</ul>
        <h2>Safe checks to try</h2>
        <ol>${guide.safeSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
        <h2>When to stop and get professional help</h2>
        <p>${escapeHtml(guide.warning)}</p>
        <p><a href="/">Explore FixMate repair guidance</a> · <a href="/help">Get repair support</a></p>
      </article>
    </main>
  `;
}

export function getSeoPrerenderPages(): SeoPrerenderPage[] {
  const pages = Object.entries(routeMetadata).flatMap(([path, metadata]) => {
    const content = documentContent(path);
    return content
      ? [{
          path,
          title: metadata.title,
          description: metadata.description,
          noindex: Boolean(metadata.noindex),
          content,
        }]
      : [];
  });

  for (const guide of repairGuides) {
    const path = `/repair-guides/${guide.slug}`;
    const content = documentContent(path);
    if (!content) continue;
    pages.push({
      path,
      title: guide.title,
      description: guide.metaDescription,
      noindex: false,
      content,
    });
  }

  return pages;
}