/**
 * A trimmed-down scenario generate response (job scenario_0705fc1f…), one
 * question per type. Texts are shortened; keys and nesting are exactly as the
 * API returns them, including the quirks the reader has to handle: an evidence
 * indicator with a leading space, empty constraint lists, and SCENARIO_MCQ /
 * SCENARIO_MULTISELECT type names.
 */

const anchors = (topic: string) => ({
  "0": `No ${topic}.`,
  "1": `Basic ${topic}.`,
  "2": `Sound ${topic}.`,
  "3": `Thorough ${topic}.`,
});

export const scenarioOutputFixture = {
  job_id: "scenario_0705fc1f_test_user_id_123",
  questions: {
    "Scenario MCQ Question": [
      {
        question_id: "q_425ac0d9cbe4",
        question_type: "SCENARIO_MCQ",
        scenario_domain: "Project delays",
        scenario: {
          title: "Managing Delays Caused by Vendor Handoff",
          constraints: ["The project baseline schedule requires formal change log tracking."],
          description: "The vendor's core module will be two weeks late.",
        },
        question_text: "What is the most appropriate immediate action?",
        options: [
          { text: "Compress the test window.", index: 0 },
          { text: "Move the deadline independently.", index: 1 },
          { text: "Evaluate impact and update the risk register.", index: 2 },
          { text: "Demand contractual penalties.", index: 3 },
        ],
        difficulty_level: "advanced",
        correct_option_index: 2,
        answer_rationale: { correct_answer_explanation: "Assess before acting." },
      },
    ],
    "Scenario Multi-Select Question": [
      {
        question_id: "q_68b1abd27c62",
        question_type: "SCENARIO_MULTISELECT",
        scenario_domain: "scope creep",
        scenario: {
          title: "Handling Additional Feature Requests",
          constraints: [],
          description: "A stakeholder asks for three unplanned dashboards.",
        },
        question_text: "Which two actions should the project manager take?",
        options: [
          { text: "Submit them through formal change control.", index: 0 },
          { text: "Add them immediately.", index: 1 },
          { text: "Analyse scope, cost and schedule impact.", index: 2 },
          { text: "Reject them outright.", index: 3 },
        ],
        difficulty_level: "advanced",
        correct_option_index: [0, 2],
        answer_rationale: { correct_answer_explanation: "Evaluate through change control." },
      },
    ],
    "Open Text Question": [
      {
        question_id: "q_143afa22b7a9",
        question_type: "OPEN_TEXT",
        scenario_domain: "resource allocation",
        scenario: {
          title: "Reallocating Developers Across Concurrent Projects",
          constraints: ["Project B's client sponsor is sensitive to team continuity."],
          description: "A lead developer on the regulatory project resigns.",
        },
        question_text: "Explain how you would handle this resource allocation challenge.",
        reference_answer: "Move the lead developer to Project A and re-plan Project B with its sponsor.",
        difficulty_level: "advanced",
        rubric: [
          {
            criterion: "Resource Prioritization and Alignment",
            description: "Prioritises the regulatory commitment.",
            score_anchors: anchors("prioritisation"),
            weight_percent: 40,
            evidence_indicators: ["Prioritizes Project A", "Reallocates the right capability"],
          },
          {
            criterion: "Stakeholder Communication and Trade-off Management",
            description: "Communicates the trade-offs.",
            score_anchors: anchors("communication"),
            weight_percent: 35,
            evidence_indicators: ["Speaks to Project B's sponsor"],
          },
          {
            criterion: "Risk Assessment and Mitigation Plan",
            description: "Identifies and mitigates risks.",
            score_anchors: anchors("risk analysis"),
            weight_percent: 25,
            evidence_indicators: ["Backfills Project B"],
          },
        ],
        answer_rationale: { correct_answer_explanation: "Prioritise the fixed deadline, communicate trade-offs." },
      },
    ],
    "Ranking Question": [
      {
        question_id: "q_5f7b62a5e2b4",
        question_type: "SJT_RANKING",
        scenario_domain: "budget overruns",
        scenario: {
          title: "Responding to Forecasted Cost Overruns",
          constraints: [],
          description: "Licensing costs are 15% over estimate.",
        },
        question_text: "Rank the following actions from MOST effective to LEAST effective.",
        options: [
          { text: "Analyse the root cause.", index: 0 },
          { text: "Find optimisations within approved limits.", index: 1 },
          { text: "Reallocate funds without documenting it.", index: 2 },
          { text: "Submit a formal change request.", index: 3 },
        ],
        correct_ranking: [0, 1, 3, 2],
        difficulty_level: "advanced",
        answer_rationale: { correct_answer_explanation: "Analyse, optimise, escalate; never hide it." },
      },
    ],
    "Action Planning Question": [
      {
        question_id: "q_4dfa1aff4753",
        question_type: "ACTION_PLANNING",
        scenario_domain: "stakeholder escalations",
        scenario: {
          title: "Addressing Executive Escalation Over Status Reporting",
          constraints: [],
          description: "An executive says status reports hide technical risks.",
        },
        question_text: "Develop a step-by-step action plan.",
        expected_components: [
          "Meet the executive to understand their reporting needs.",
          "Update the status report format to show risks and mitigations.",
        ],
        difficulty_level: "advanced",
        rubric: [
          {
            criterion: "Escalation Diagnosis and Stakeholder Engagement",
            description: "Engages the stakeholder first.",
            score_anchors: anchors("engagement"),
            weight_percent: 100,
            evidence_indicators: ["Schedules a direct discussion", " Gathers specific requirements for risk visibility"],
          },
        ],
        answer_rationale: { correct_answer_explanation: "Listen, fix the reports, align the team." },
      },
    ],
    "Short Answer Question": [
      {
        question_id: "q_87c281f70f86",
        question_type: "SHORT_ANSWER",
        scenario_domain: "Project delays",
        scenario: {
          title: "Identifying Initial Action for Critical Path Task Delay",
          constraints: [],
          description: "A critical path task is three days behind.",
        },
        question_text: "What is the immediate first step? Answer in 1 to 3 sentences.",
        expected_answer: "Assess the obstacle with the task owner and evaluate recovery options.",
        difficulty_level: "advanced",
        rubric: [
          {
            criterion: "Identification of Initial Action",
            description: "Names engaging the task owner as the first step.",
            score_anchors: anchors("identification"),
            weight_percent: 100,
            evidence_indicators: ["Meets the task owner immediately"],
          },
        ],
        answer_rationale: { correct_answer_explanation: "Get the facts before changing the baseline." },
      },
    ],
  },
};

/** The questions in response order, as Index's flattenInOrder reads them. */
export const scenarioFixtureQuestions = Object.values(scenarioOutputFixture.questions).flat();

/** One raw question of the given API type, typed loosely as the reader receives it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const rawScenarioQuestion = (questionType: string): Record<string, any> => {
  const q = scenarioFixtureQuestions.find((x) => x.question_type === questionType);
  if (!q) throw new Error(`No ${questionType} question in the fixture`);
  return q;
};
