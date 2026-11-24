import { describe, it, expect } from 'vitest';
import { extractProfileFromText } from '../resumeExtractor.js';

describe('Client-side Resume Extractor', () => {
  it('extracts real candidate profile from text cleanly', () => {
    const rawResume = `
      John Doe
      Senior Full-Stack Engineer
      San Francisco, CA | john.doe@example.com | +1 415-555-0199 | linkedin.com/in/johndoe | github.com/johndoe

      Summary:
      Passionate engineer with 7+ years of experience designing scalable distributed web platforms and real-time systems.

      Experience:
      Staff Engineer | TechCorp Inc
      2021 - Present
      Led migration of monolithic services to Go microservices.
      Improved pipeline deployment speeds by 60%.

      Education:
      Bachelor of Science in Computer Science | Stanford University

      Skills:
      TypeScript, React, Node.js, Go, PostgreSQL, Docker, Kubernetes, AWS, Git
    `;

    const { profile, rawText } = extractProfileFromText(rawResume, 'john_doe_resume.pdf');

    expect(profile.contact.fullName).toBe('John Doe');
    expect(profile.contact.email).toBe('john.doe@example.com');
    expect(profile.contact.phone).toBe('+1 415-555-0199');
    expect(profile.contact.location).toContain('San Francisco');
    expect(profile.contact.linkedinUrl).toBe('https://linkedin.com/in/johndoe');

    expect(profile.experiences.length).toBeGreaterThanOrEqual(1);
    expect(profile.experiences[0].company).toBe('TechCorp Inc');

    expect(profile.education.length).toBeGreaterThanOrEqual(1);

    const skillNames = profile.skills.map((s) => s.name);
    expect(skillNames).toContain('TypeScript');
    expect(skillNames).toContain('React');
    expect(skillNames).toContain('Go');
    expect(skillNames).toContain('Docker');

    expect(rawText).toBe(rawResume);
  });

  it('extracts real-world candidate profile with complex PDF layout and Afghan contact info', () => {
    const ferdousResume = `
FERDOUS KAZEMI
Herat , Afghanistan
+93 703093770 • ferdouskazemi1000@gmail.com • https://www.linkedin.com/in/ferdous-kazemi/
Resume
Mid-Level Front-End Developer
With over three years of experience in American startups, I am a dedicated Front End Developer. At Inolitix and
Taglet, I gained strong skills in modern web development, UI design, and the latest technologies. I create
dynamic, responsive, and user-friendly applications that improve user experience and support business growth.
Front-End Development • Application Design (UI & UX) • Web Applications • WordPress Designing • Coding •
Testing & Debugging • Maintenance • Communications • SEO Improvement.
Languages: Typescript / JavaScript
Web Design : Tailwind Css, Shadcn UI , Motions
Frameworks: React, NextJs
Databases: My SQL
Cloud Technologies: Microsoft Azure , GitHub Actions
SDLC: Agile
Tools: Git, GitHub, MS Team ,
Platform : HubSpot , Hotjar, Analytics ,GTM , Map Box ,3D ,Chart.js & QuickBooks.
PROFESSIONAL EXPERIENCE
INOLITIX , CA , United States • 2022 – current
Part-time Front-End Developer | UI & UX | WordPress Designer (2022 August - Current)
Acted as a part-time Front-End developer to create UI & UX for Applications and implement them into code.
Tasks:
 Implemented the Official Website for the team at Company ( MSN Forenzix ).
 Convert data to visualization charts using 3D and Chart.js.
 Designed UI & UX and implemented them into code .
 Acting as an active team player supporting other developers .
Technologies: Typescript, JavaScript, React, Next Js , Redux , Figma, 3D, MapBox, WordPress, Plaid, QuickBooks,
True Tale , LA , United States • 2022 – 2024
Front-End Developer | WordPress Designer ( 2022 August – 2024 July )
Responsible for frontend design and development Tasks with different projects
Tasks:
 Implemented Official Website ( taglet.io ) with WordPress.
 Implemented Front End Tasks (Dashboard, User Management, Sign In & Sign Up, Profile Setting and …).
 Improved SEO performance of company website.
 Integrate with Third-party apps Hubspot ,Hotjar, Analytics .
 Contribute to the expoprint.io Official Website with Shopify.
 Implemented the p.torranceherniacenter.com for THC.
EDUCATION
B.Sc. Computer Science , Software Engineering
Herat University, Herat, Afghanistan 2018 Jan – 2022 Dec
    `;

    const { profile } = extractProfileFromText(ferdousResume, 'Ferdous Kazemi Resume (april 2025).pdf');

    expect(profile.contact.fullName.toLowerCase()).toContain('ferdous kazemi');
    expect(profile.contact.email).toBe('ferdouskazemi1000@gmail.com');
    expect(profile.contact.phone).toContain('703093770');
    expect(profile.contact.location).toBe('Herat , Afghanistan');
    expect(profile.contact.linkedinUrl).toContain('ferdous-kazemi');

    expect(profile.summary).toContain('American startups');
    expect(profile.targetTitles?.[0]).toContain('Front-End Developer');

    // Experience extraction
    expect(profile.experiences.length).toBeGreaterThanOrEqual(1);

    // Skills extraction
    const skills = profile.skills.map((s) => s.name);
    expect(skills).toContain('TypeScript');
    expect(skills).toContain('React');
    expect(skills).toContain('JavaScript');
  });
});
