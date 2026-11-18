import { useEffect, useState, type FormEvent } from "react";
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { accountRequest } from "../api/restaurantProfile";
import { squareStateKey } from "../hooks/useSquareReturn";

type Status = { configured: boolean; connected: boolean; environment: string | null; redirect_uri: string | null };
type Choice = { id: string; name: string };
type Range = { location_id: string; start: string; end: string };
type Preview = {
  revision: string;
  items: (Choice & { lines: number; quantity: number })[];
  dishes: { id: number; name: string }[];
  already_imported: number;
  unsupported: number;
};
type ImportResult = { imported: number; needs_attention: number; unmapped: number; already_imported: number; unsupported: number };

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function SquareSalesImport({ onImported }: { onImported: () => Promise<void> }) {
  const [status, setStatus] = useState<Status>();
  const [locations, setLocations] = useState<Choice[]>();
  const [locationId, setLocationId] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [preview, setPreview] = useState<{ data: Preview; range: Range }>();
  const [mappings, setMappings] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ImportResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const current = await accountRequest<Status>("square");
      if (!active) return;
      setStatus(current);
      if (current.configured && current.connected) {
        const values = await accountRequest<Choice[]>("square/locations");
        if (!active) return;
        setLocations(values);
        if (values.length === 1) setLocationId(values[0].id);
      }
    })().catch(error => { if (active) setError(error instanceof Error ? error.message : "Square could not be loaded."); });
    return () => { active = false; };
  }, [reload]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : "Square could not complete the request."); }
    finally { setBusy(false); }
  };
  const clearPreview = () => { setPreview(undefined); setMappings({}); setResult(undefined); };
  const loadPreview = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      clearPreview();
      const first = new Date(`${start}T00:00:00`);
      const last = new Date(`${end}T00:00:00`);
      const days = (Date.parse(end) - Date.parse(start)) / 86400000;
      if (!Number.isFinite(days) || days < 0 || days > 6) throw new Error("Choose a range of up to seven calendar days.");
      last.setDate(last.getDate() + 1);
      const range = { location_id: locationId, start: first.toISOString(), end: last.toISOString() };
      setPreview({ data: await accountRequest<Preview>("square/preview", "POST", range), range });
    });
  };

  const redirectOrigin = status?.redirect_uri ? new URL(status.redirect_uri).origin : undefined;
  return <Card id="square-sales" variant="outlined" sx={{ mb: 3, scrollMarginTop: 72 }}>
    <CardContent><Stack spacing={2}>
      <Box>
        <Typography component="h2" variant="h6">Square POS</Typography>
        <Typography variant="body2" color="text.secondary">Connect Square to review and import sales into Menurithm. Only mapped dishes are imported.</Typography>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {!status && !error && <Typography role="status">Checking Square connection…</Typography>}
      {status && !status.configured && <Alert severity="info">Square is not configured in this environment. You can still record sales or upload a CSV.</Alert>}
      {status?.configured && status.environment === "sandbox" && <Alert severity="warning">Square Sandbox is for testing only. Do not import test orders into a real kitchen workspace.</Alert>}
      {error && (!status || (status.connected && !locations)) && <Box><Button onClick={() => { setError(""); setReload(value => value + 1); }}>Retry</Button></Box>}
      {status?.configured && !status.connected && <Box>
        {redirectOrigin !== location.origin
          ? <Button href={`${redirectOrigin}/dashboard/sales#square-sales`} variant="outlined">Open Square setup on {redirectOrigin}</Button>
          : <Button variant="outlined" disabled={busy} onClick={() => void run(async () => {
            const authorization = await accountRequest<{ url: string; state: string }>("square/authorize", "POST");
            sessionStorage.setItem(squareStateKey, authorization.state);
            location.assign(authorization.url);
          })}>Connect Square</Button>}
      </Box>}
      {status?.connected && <>
        <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1} useFlexGap>
          <Typography variant="body2">Square linked to Menurithm</Typography>
          <Button size="small" disabled={busy} onClick={() => void run(async () => {
            await accountRequest("square", "DELETE");
            clearPreview();
            setLocations(undefined);
            setLocationId("");
            setStatus({ ...status, connected: false });
          })}>Disconnect from Menurithm</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">Disconnecting keeps imported sales. To revoke access at Square, remove Menurithm in your Square account.</Typography>
        {locations?.length === 0 && <Alert severity="info">No locations were returned by Square.</Alert>}
        {!!locations?.length && <Stack component="form" onSubmit={loadPreview}
          direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField select required label="Square location" value={locationId} disabled={busy}
            onChange={event => { setLocationId(event.target.value); clearPreview(); }} sx={{ minWidth: 180 }}>
            {locations.map(item => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
          </TextField>
          <TextField required label="From" type="date" value={start} disabled={busy}
            slotProps={{ inputLabel: { shrink: true } }} onChange={event => { setStart(event.target.value); clearPreview(); }} />
          <TextField required label="Through" type="date" value={end} disabled={busy}
            slotProps={{ inputLabel: { shrink: true } }} onChange={event => { setEnd(event.target.value); clearPreview(); }} />
          <Button type="submit" variant="outlined" disabled={busy || !locationId}>{busy ? "Working…" : "Preview sales"}</Button>
        </Stack>}
      </>}
      {preview && <>
        <Typography component="h3" variant="subtitle1" fontWeight={700}>Match Square items to dishes</Typography>
        <Typography variant="body2" color="text.secondary">
          {preview.data.already_imported} already imported · {preview.data.unsupported} unsupported sale lines.
          Dates use this device’s time zone. Imports use Square’s base item prices, before discounts and tax.
        </Typography>
        {!preview.data.items.length && <Alert severity="info">No new eligible Square sale lines in this date range.</Alert>}
        {!!preview.data.items.length && !preview.data.dishes.length && <Alert severity="info">Create a dish in Dishes & recipes before importing sales.</Alert>}
        {preview.data.items.map(item => <Stack key={item.id} direction={{ xs: "column", sm: "row" }} spacing={1}
          alignItems={{ sm: "center" }} justifyContent="space-between">
          <Typography sx={{ overflowWrap: "anywhere" }}>{item.name} · {item.quantity} sold ({item.lines} lines)</Typography>
          <TextField select size="small" label={`Dish for ${item.name}`} value={mappings[item.id] ?? ""}
            disabled={busy || !preview.data.dishes.length} sx={{ minWidth: { sm: 220 } }}
            onChange={event => setMappings(current => {
              const next = { ...current };
              if (event.target.value === "") delete next[item.id];
              else next[item.id] = Number(event.target.value);
              return next;
            })}>
            <MenuItem value="">Skip this item</MenuItem>
            {preview.data.dishes.map(dish => <MenuItem key={dish.id} value={dish.id}>{dish.name}</MenuItem>)}
          </TextField>
        </Stack>)}
        {!!preview.data.items.length && <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Importing can deduct recipe ingredients. Don’t import sales already entered manually or by CSV. Refunds are not synchronized.
          </Typography>
          <Button variant="contained" disabled={busy || !Object.keys(mappings).length} onClick={() => void run(async () => {
            const summary = await accountRequest<ImportResult>("square/import", "POST", {
              ...preview.range, revision: preview.data.revision, mappings,
            });
            setPreview(undefined);
            setMappings({});
            setResult(summary);
            await onImported();
          })}>Import mapped sales</Button>
        </Box>}
      </>}
      {result && <Alert severity={result.needs_attention ? "warning" : "success"}>
        {result.imported} sales imported · {result.needs_attention} need inventory review · {result.unmapped} unmapped · {result.already_imported} already imported.
      </Alert>}
    </Stack></CardContent>
  </Card>;
}
