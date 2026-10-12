import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { okResponse } from "@/test/kcm-fixture";
import { fetchCourseContent, fetchCourseDocuments } from "./contextual-documents";

const COURSE_ID = "do_1146656486545080321269";
const READ_URL = `/apis/proxies/v8/extended/content/v1/read/${COURSE_ID}`;

const courseBody = {
  result: {
    content: {
      identifier: COURSE_ID,
      name: "Create course v2",
      instructions: "<ul><li>Outcome one</li></ul>",
      children: [
        {
          identifier: "do_pdf",
          name: "Handbook",
          mimeType: "application/pdf",
          artifactUrl: "https://example.test/handbook.pdf",
        },
      ],
    },
  },
};

describe("fetchCourseContent", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(() => okResponse(courseBody));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("reads the course from the extended content-read endpoint", async () => {
    const res = await fetchCourseContent(COURSE_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      READ_URL,
      expect.objectContaining({ method: "GET" })
    );
    expect(res).toMatchObject({ ok: true, content: courseBody.result.content });
  });

  it("shares one request between concurrent callers for the same course", async () => {
    const [a, b] = await Promise.all([
      fetchCourseContent(COURSE_ID),
      fetchCourseContent(COURSE_ID),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("shares the request with the contextual documents lookup", async () => {
    const [content, docs] = await Promise.all([
      fetchCourseContent(COURSE_ID),
      fetchCourseDocuments(COURSE_ID, "Create course v2"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(content.content?.instructions).toBe("<ul><li>Outcome one</li></ul>");
    expect(docs.status).toBe("available");
    expect(docs.files.map((f) => f.name)).toEqual(["Handbook"]);
  });

  it("fetches again once the previous request has settled", async () => {
    await fetchCourseContent(COURSE_ID);
    await fetchCourseContent(COURSE_ID);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a failed read and does not keep it for the next caller", async () => {
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 500 } as Response)
    );
    expect(await fetchCourseContent(COURSE_ID)).toEqual({ ok: false, status: 500 });

    const retry = await fetchCourseContent(COURSE_ID);
    expect(retry.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lets one caller abort without cancelling the shared request", async () => {
    let release!: () => void;
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => {
        release = () => resolve({ ok: true, json: () => Promise.resolve(courseBody) } as Response);
      })
    );

    const controller = new AbortController();
    const docs = fetchCourseDocuments(COURSE_ID, "Create course v2", controller.signal);
    const content = fetchCourseContent(COURSE_ID);

    controller.abort();
    await expect(docs).rejects.toMatchObject({ name: "AbortError" });

    release();
    expect((await content).ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
