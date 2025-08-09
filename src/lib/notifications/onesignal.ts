type SendResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

export async function sendWebPushToSubscriptionIds(params: {
  appId: string;
  restApiKey: string;
  subscriptionIds: string[];
  title: string;
  body?: string | null;
  url?: string;
}): Promise<SendResult> {
  const { appId, restApiKey, subscriptionIds, title, body, url } = params;

  if (!subscriptionIds.length) return { ok: true };

  try {
    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        authorization: `Key ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        target_channel: "push",
        include_subscription_ids: subscriptionIds,
        headings: { en: title },
        contents: { en: body || "" },
        url,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `HTTP ${response.status}: ${text}` };
    }
    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
