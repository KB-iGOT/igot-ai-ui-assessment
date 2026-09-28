/**
 * A trimmed-down framework/v1/read/kcmfinal_fw response. Keeps the quirks the
 * loader has to handle: duplicated associations (Budgeting under Functional),
 * an area the editor doesn't offer from the API (Domain), and unsorted terms.
 */
export const kcmFixture = {
  responseCode: "OK",
  result: {
    framework: {
      identifier: "kcmfinal_fw",
      categories: [
        {
          code: "competencyarea",
          terms: [
            {
              identifier: "area_behavioural",
              name: "Behavioural",
              associations: [
                { identifier: "theme_team", name: "Team Leadership" },
                { identifier: "theme_collab", name: "Collaboration" },
                { identifier: "theme_comm", name: "Communication" },
              ],
            },
            {
              identifier: "area_functional",
              name: "Functional",
              associations: [
                { identifier: "theme_budget", name: "Budgeting" },
                { identifier: "theme_budget", name: "Budgeting" },
                { identifier: "theme_budget", name: "Budgeting" },
                { identifier: "theme_data", name: "Data Analytics" },
              ],
            },
            {
              identifier: "area_domain",
              name: "Domain",
              associations: [{ identifier: "theme_x", name: "Some Domain Theme" }],
            },
          ],
        },
        {
          code: "theme",
          terms: [
            {
              identifier: "theme_collab",
              name: "Collaboration",
              associations: [
                { identifier: "sub_rel", name: "Relationship Management" },
                { identifier: "sub_div", name: "Diversity & Inclusion" },
                { identifier: "sub_know", name: "Knowledge Sharing" },
                { identifier: "sub_div", name: "Diversity & Inclusion" },
              ],
            },
            {
              identifier: "theme_comm",
              name: "Communication",
              associations: [{ identifier: "sub_listen", name: "Active Listening" }],
            },
            { identifier: "theme_team", name: "Team Leadership", associations: [] },
            {
              identifier: "theme_budget",
              name: "Budgeting",
              associations: [{ identifier: "sub_forecast", name: "Forecasting" }],
            },
          ],
        },
      ],
    },
  },
};

export const okResponse = (body: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
