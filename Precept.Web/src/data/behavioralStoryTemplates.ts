export interface BehavioralStoryTemplate {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string;
}

export const BEHAVIORAL_STORY_TEMPLATES: BehavioralStoryTemplate[] = [
  {
    title: 'Resolved a production outage under pressure',
    situation: 'On a Friday afternoon, our payment processing service went down. Customers could not complete checkout, the error rate spiked to 100%, and the on-call engineer was unreachable.',
    task: 'As the senior engineer online, I needed to identify the root cause, restore service, and communicate status to stakeholders within minutes.',
    action: 'I pulled the team into a war room, split responsibilities between log analysis and rollback preparation, and reviewed recent deploys. I discovered a missing database index on a new query path introduced in the latest release. I applied a hotfix migration, verified query plans, and monitored recovery dashboards.',
    result: 'Service recovered in 18 minutes. I wrote a postmortem, added an integration test for query plans, and instituted a 30-minute canary window for high-risk deploys. Checkout success rate returned to 99.9%.',
    tags: 'ownership, incident response, communication',
  },
  {
    title: 'Disagreed with a teammate on architecture',
    situation: 'My team was divided on whether to adopt a micro-frontend architecture. One senior engineer strongly favored splitting our React app, while I was concerned about deployment complexity and shared state.',
    task: 'I needed to make the best technical decision for the team without creating conflict or slowing the project down.',
    action: 'I scheduled a focused decision meeting, proposed a time-boxed prototype for each approach, and defined objective criteria: build time, bundle size, and time-to-first-error for new developers. We ran both prototypes for one week.',
    result: 'The data showed micro-frontends added significant overhead for our team size. We chose a module-federation-lite approach instead, which kept the monorepo while enabling independent deployments. The decision was unanimous and documented in an ADR.',
    tags: 'conflict, collaboration, architecture',
  },
  {
    title: 'Learned a new stack to meet a deadline',
    situation: 'Halfway through a backend rewrite, our lead left the company. The remaining team had little experience with the new Go service we were building, and the client deadline was six weeks away.',
    task: 'I had to get up to speed on Go and our service architecture quickly enough to keep the project on track.',
    action: 'I blocked two days for focused learning, built a small reference service to internalize idioms, and paired with a contractor for daily code reviews. I also started a shared cheat-sheet for common patterns the team encountered.',
    result: 'I shipped the three highest-risk endpoints on time. The cheat-sheet became the team’s most-visited internal doc, and onboarding time for new hires dropped by roughly 40%.',
    tags: 'adaptability, learning, delivery',
  },
  {
    title: 'Led a project with an aggressive deadline',
    situation: 'Leadership committed our team to delivering a new analytics dashboard for an upcoming board meeting, giving us four weeks from concept to demo.',
    task: 'I was asked to lead the project. I needed to scope the work, keep the team focused, and deliver a stable demo without burning anyone out.',
    action: 'I broke the work into weekly milestones, cut non-essential features early, and protected the team from scope creep by routing all new requests through a single backlog. I ran daily 10-minute standups and weekly demos to maintain momentum.',
    result: 'We delivered the demo two days early. The board approved continued investment, and the team cited the project as one of the most organized sprints they had worked on.',
    tags: 'leadership, scoping, delivery',
  },
  {
    title: 'Improved team code review culture',
    situation: 'Our code reviews had become a bottleneck. PRs sat for days, feedback felt personal, and junior engineers were hesitant to ask questions.',
    task: 'I wanted to make reviews faster, kinder, and more educational without adding process overhead.',
    action: 'I proposed a lightweight review guideline emphasizing questions over commands, suggested a 24-hour review SLA, and started a weekly "review club" where we discussed one exemplary PR and one learning opportunity.',
    result: 'Average PR turnaround dropped from 2.5 days to under 18 hours. Junior engineers reported feeling more supported, and the number of post-merge bugs decreased by about 25% over the next quarter.',
    tags: 'collaboration, mentorship, process',
  },
];
