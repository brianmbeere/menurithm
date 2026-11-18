import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button, Checkbox, Chip,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Snackbar,
  Stack, TablePagination, TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { PageHeading, WorkspaceIcon } from "./WorkspaceUI";
import { updateInventory, type InventoryItem } from "../api/updateInventory";
import deleteInventory from "../api/deleteInventory";
import uploadInventoryFile from "../api/uploadInventoryFile";
import fetchInventory from "../api/fetchInventory";
import addInventory from "../api/addInventory";
import { advancedInventoryAPI } from "../api/advancedInventory";
import { fetchInventoryMovements, type InventoryMovement } from "../api/fetchInventoryMovements";
import { fetchLowStockInventory } from "../api/fetchLowStockInventory";
import CSVHelpDialog from "./CSVHelpDialog";
import ProduceOrderDialog from "./ProduceOrderDialog";

type Fields = Omit<InventoryItem, "id" | "adjustment_reason">;
type Editor = { mode: "add" | "details" | "count"; original?: InventoryItem; draft: Fields };
type View = "all" | "reorder" | "out";
const empty: Fields = {
  ingredient_name: "", quantity: "", reorder_point: "0", unit: "", category: "", expiry_date: "", storage_location: "",
};
const suggestions = {
  unit: ["lb", "kg", "oz", "g", "L", "bunch", "pieces", "packs"],
  category: ["Vegetables", "Grains", "Dairy", "Herbs", "Spices", "Poultry", "Meat", "Seafood", "Beverages"],
  storage_location: ["Pantry", "Fridge", "Freezer", "Cellar", "Dry Storage"],
};
const decimal = /^\d+(?:\.\d*)?$|^\.\d+$/;
const canonical = (value: string) => {
  const [whole, fraction = ""] = value.split(".");
  return `${whole.replace(/^0+/, "") || "0"}.${fraction.replace(/0+$/, "")}`;
};
const sameQuantity = (a: string, b: string) => canonical(a) === canonical(b);
const outOfStock = (item: InventoryItem) => sameQuantity(item.quantity, "0");
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const columns = "auto minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) 9.5rem";
const localDate = (date: string) => date ? new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString() : "Not set";

export default function InventoryManager() {
  const mobile = useMediaQuery(useTheme().breakpoints.down("sm"));
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [reorderIds, setReorderIds] = useState<Set<number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reorderError, setReorderError] = useState("");
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(new Set<number>());
  const [editor, setEditor] = useState<Editor | null>(null);
  const [reason, setReason] = useState("");
  const [editorError, setEditorError] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<InventoryMovement[]>([]);
  const [historyState, setHistoryState] = useState<"loading" | "ready" | "error">("loading");
  const historyRequest = useRef(0);
  const [remove, setRemove] = useState<InventoryItem[] | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [source, setSource] = useState<{ id?: number } | null>(null);
  const [csv, setCsv] = useState<File | null>(null);
  const [csvHelp, setCsvHelp] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ text: string; severity: "success" | "error" | "info" } | null>(null);

  async function refresh() {
    setLoading(true);
    setLoadError("");
    setReorderError("");
    const [inventory, reorder] = await Promise.allSettled([fetchInventory(), fetchLowStockInventory()]);
    if (inventory.status === "fulfilled") setItems(inventory.value);
    else setLoadError(errorText(inventory.reason, "Could not load inventory."));
    if (reorder.status === "fulfilled") setReorderIds(new Set(reorder.value.map(item => item.id)));
    else {
      setReorderIds(null);
      setReorderError(errorText(reorder.reason, "Could not load reorder status."));
      setView(current => current === "reorder" ? "all" : current);
      setPage(0);
    }
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  const locations = [...new Set(items.map(item => item.storage_location).filter(Boolean))].sort();
  const filtered = items.filter(item =>
    (view === "all" || (view === "out" ? outOfStock(item) : reorderIds?.has(item.id))) &&
    (!location || item.storage_location === location) &&
    [item.ingredient_name, item.category, item.storage_location].some(value => value.toLowerCase().includes(search.trim().toLowerCase())),
  ).sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name));
  const activePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const visible = filtered.slice(activePage * pageSize, (activePage + 1) * pageSize);
  const visibleSelected = visible.filter(item => selected.has(item.id)).length;
  const selectedItems = items.filter(item => selected.has(item.id));

  function changeFilters() {
    setPage(0);
    setSelected(new Set());
  }

  function updateSelection(ids: number[], checked: boolean) {
    setSelected(previous => {
      const next = new Set(previous);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function openEditor(mode: Editor["mode"], original?: InventoryItem) {
    setReason("");
    setEditorError("");
    setEditor({ mode, original, draft: original ? { ...original } : { ...empty } });
  }

  function field(key: keyof Fields, value: string) {
    setEditor(previous => previous && { ...previous, draft: { ...previous.draft, [key]: value } });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || busy) return;
    const draft = { ...editor.draft, ingredient_name: editor.draft.ingredient_name.trim(),
      unit: editor.draft.unit.trim(), category: editor.draft.category.trim(), storage_location: editor.draft.storage_location.trim(),
      quantity: editor.draft.quantity.trim(), reorder_point: editor.draft.reorder_point.trim() || "0" };
    if ((editor.mode !== "details" && !decimal.test(draft.quantity)) ||
        (editor.mode !== "count" && !decimal.test(draft.reorder_point))) {
      setEditorError("Enter a nonnegative decimal for stock and reorder point.");
      return;
    }
    if (editor.mode !== "count" && (!draft.ingredient_name || !draft.unit || !draft.category || !draft.storage_location || !draft.expiry_date)) {
      setEditorError("Enter a name, unit, category, storage location, and expiry date.");
      return;
    }
    const { original, mode } = editor;
    if (mode === "count" && original && sameQuantity(draft.quantity, original.quantity)) {
      setEditorError("The new count matches the recorded quantity. No adjustment is needed.");
      return;
    }
    if (mode === "count" && !reason.trim()) {
      setEditorError("Enter a reason for this stock adjustment.");
      return;
    }
    setEditorError("");
    setBusy(true);
    try {
      if (!original) {
        await addInventory(draft);
      } else {
        const latest = (await fetchInventory()).find(item => item.id === original.id);
        if (!latest || latest.ingredient_name !== original.ingredient_name) {
          setEditorError("This ingredient was changed or removed. Close this dialog and refresh the inventory list.");
          return;
        }
        if (mode === "count" && (!sameQuantity(latest.quantity, original.quantity) || latest.unit !== original.unit)) {
          setEditor(previous => previous && { ...previous, original: latest,
            draft: latest.unit === original.unit ? previous.draft : { ...latest, quantity: "" } });
          setEditorError("The recorded stock changed while you were editing. Review the current count and confirm your new count again.");
          return;
        }
        if (mode === "details" && (["ingredient_name", "unit", "category", "storage_location", "expiry_date", "reorder_point"] as const)
          .some(key => latest[key] !== original[key])) {
          setEditorError("The ingredient details changed while you were editing. Close this dialog and refresh before trying again.");
          return;
        }
        await updateInventory(mode === "count"
          ? { ...latest, quantity: draft.quantity, adjustment_reason: reason.trim() }
          : { ...draft, id: latest.id, quantity: latest.quantity }, latest.ingredient_name);
      }
      setEditor(null);
      setNotice({ text: mode === "count" ? "Stock count saved." : original ? "Ingredient details saved." : "Ingredient added.", severity: "success" });
      await refresh();
    } catch (error) {
      setEditorError(errorText(error, "Could not save this ingredient."));
    } finally {
      setBusy(false);
    }
  }

  async function showDetails(item: InventoryItem) {
    const request = ++historyRequest.current;
    setDetail(item);
    setHistory([]);
    setHistoryState("loading");
    try {
      const movements = await fetchInventoryMovements(item.ingredient_name);
      if (request === historyRequest.current) {
        setHistory(movements);
        setHistoryState("ready");
      }
    } catch (error) {
      console.error("Could not load stock movements", error);
      if (request === historyRequest.current) setHistoryState("error");
    }
  }

  function closeDetails() {
    historyRequest.current++;
    setDetail(null);
  }

  async function deleteSelected() {
    if (!remove || busy) return;
    setBusy(true);
    setRemoveError("");
    const results = await Promise.allSettled(remove.map(item => deleteInventory(item.ingredient_name)));
    const failed = remove.filter((_, index) => results[index].status === "rejected");
    const removed = remove.filter((_, index) => results[index].status === "fulfilled");
    updateSelection(removed.map(item => item.id), false);
    if (failed.length) {
      setRemove(failed);
      setRemoveError(results.flatMap((result, index) => result.status === "rejected"
        ? [`${remove[index].ingredient_name}: ${errorText(result.reason, "Could not delete ingredient.")}`] : []).join("\n"));
    } else setRemove(null);
    if (removed.length) {
      setNotice({ text: `${removed.length} ingredient${removed.length === 1 ? "" : "s"} deleted.`, severity: "success" });
      await refresh();
    }
    setBusy(false);
  }

  async function importCsv() {
    if (!csv || busy) return;
    setBusy(true);
    setImportWarnings([]);
    try {
      const result = await uploadInventoryFile(csv);
      setCsv(null);
      setImportWarnings(result.warnings ?? []);
      setNotice({ text: `Imported ${result.processed_count} inventory row(s).`, severity: result.warnings?.length ? "info" : "success" });
      await refresh();
    } catch (error) {
      setNotice({ text: errorText(error, "Could not import inventory."), severity: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function runAdvanced(tool: "optimization" | "orders" | "alerts") {
    if (busy) return;
    setBusy(true);
    try {
      if (tool === "optimization") {
        await advancedInventoryAPI.runOptimization();
        setNotice({ text: "Inventory optimization completed.", severity: "success" });
      } else if (tool === "orders") {
        const result = await advancedInventoryAPI.createAutoOrder();
        setNotice({ text: `Auto-order tool reported ${result.orders_created} order(s).`, severity: "info" });
      } else {
        const result = await advancedInventoryAPI.getAlerts("high");
        setNotice({ text: `${result.alerts.length} high-priority alerts found.`, severity: "info" });
      }
    } catch (error) {
      setNotice({ text: errorText(error, "Could not run the inventory tool."), severity: "error" });
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(targets: InventoryItem[]) {
    setRemoveError("");
    setRemove(targets);
  }

  const count = editor?.mode === "count";
  const editorTitle = count ? `Count stock: ${editor.original?.ingredient_name}` : editor?.mode === "details" ? "Edit ingredient" : "Add ingredient";

  return <Box>
    <PageHeading icon="inventory" title="Inventory" description="Count kitchen stock, track changes, and see what needs replenishing."
      actions={<Stack direction="row" gap={1} flexWrap="wrap">
        <Button variant="contained" startIcon={<WorkspaceIcon name="add" />} onClick={() => openEditor("add")}>Add ingredient</Button>
        <Button variant="outlined" startIcon={<WorkspaceIcon name="shop" />} onClick={() => setSource({})}>Find produce</Button>
      </Stack>} />
    <Stack spacing={2.5}>
      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {([
          ["all", "Total ingredients", items.length], ["reorder", "Low stock", reorderIds?.size],
          ["out", "Out of stock", items.filter(outOfStock).length],
        ] as const).map(([id, label, total]) => <Button key={id}
          variant="outlined" aria-pressed={view === id} disabled={id === "reorder" && reorderIds === null}
          onClick={() => { setView(id); changeFilters(); }}
          sx={{ display: "grid", alignContent: "center", justifyItems: "start", textAlign: "left", borderColor: view === id ? "primary.dark" : "divider",
            bgcolor: view === id ? "action.selected" : "background.paper", color: "text.primary", p: { xs: 1.25, sm: 2 } }}>
          <Typography component="span" variant="h5">{loading || loadError ? "—" : total ?? "—"}</Typography>
          <Typography component="span" variant="body2">{label}</Typography>
        </Button>)}
      </Box>
      {view === "reorder" && !reorderError && <Typography variant="body2" color="text.secondary">
        Shows ingredients at or below their configured reorder point. Use Find produce to restock.
      </Typography>}

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ p: 2 }}>
          <TextField fullWidth size="small" label="Search ingredients" placeholder="Name, category, or location" value={search}
            onChange={event => { setSearch(event.target.value); changeFilters(); }} />
          <TextField select size="small" label="Storage location" value={location} sx={{ minWidth: { sm: 180 } }}
            onChange={event => { setLocation(event.target.value); changeFilters(); }}>
            <MenuItem value="">All locations</MenuItem>
            {location && !locations.includes(location) && <MenuItem value={location}>{location}</MenuItem>}
            {locations.map(name => <MenuItem key={name} value={name}>{name}</MenuItem>)}
          </TextField>
          <Button onClick={() => void refresh()} disabled={loading || busy}>Refresh</Button>
        </Stack>
        {loadError && <Alert severity="error" sx={{ mx: 2, mb: 1 }}>{loadError}</Alert>}
        {reorderError && <Alert severity="warning" sx={{ mx: 2, mb: 1 }}>Reorder status unavailable. {reorderError}</Alert>}
        {selectedItems.length > 0 && <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ px: 2, pb: 1.5 }}>
          <Typography role="status">{selectedItems.length} selected</Typography>
          <Button color="error" onClick={() => confirmDelete(selectedItems)}>Delete selected</Button>
          <Button onClick={() => setSelected(new Set())}>Clear selection</Button>
        </Stack>}
        {loading && <Box sx={{ p: 2 }}><CircularProgress size={24} aria-label="Loading inventory" /></Box>}
        {!loading && !loadError && visible.length === 0 && <Stack alignItems="flex-start" spacing={1} sx={{ p: 2 }}>
          <Typography component="h2" variant="h6">{items.length ? "No ingredients match this view" : "No ingredients yet"}</Typography>
          <Typography color="text.secondary">{items.length ? "Try a different search, stock view, or storage location." : "Start with one ingredient and its current stock. Set a reorder point to flag low stock, then link the ingredient when you build a recipe."}</Typography>
          {items.length > 0 && <Button onClick={() => { setSearch(""); setLocation(""); setView("all"); changeFilters(); }}>Clear filters</Button>}
        </Stack>}
        {visible.length > 0 && <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "auto 1fr", md: columns }, gap: 1.5,
            alignItems: "center", px: 1.5, py: 0.5, bgcolor: "background.default" }}>
            <Checkbox size="small" checked={visibleSelected === visible.length} indeterminate={visibleSelected > 0 && visibleSelected < visible.length}
              onChange={(_, checked) => updateSelection(visible.map(item => item.id), checked)}
              slotProps={{ input: { "aria-label": "Select ingredients on this page" } }} />
            <Typography variant="caption" fontWeight={700}>Ingredients</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ display: { xs: "none", md: "block" } }}>On hand</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ display: { xs: "none", md: "block" } }}>Reorder point</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ display: { xs: "none", md: "block" } }}>Actions</Typography>
          </Box>
          <Box component="ul" aria-label="Ingredient stock" sx={{ listStyle: "none", p: 0, m: 0 }}>
            {visible.map(item => {
              const reorder = reorderIds?.has(item.id);
              const zero = outOfStock(item);
              return <Box component="li" key={item.id} sx={{ display: "grid", gap: { xs: 0.75, md: 1.5 },
                gridTemplateColumns: { xs: "auto minmax(0, 1fr)", md: columns }, alignItems: "center", p: 1.5,
                borderTop: 1, borderColor: "divider", bgcolor: selected.has(item.id) ? "action.selected" : undefined, overflowWrap: "anywhere" }}>
                <Checkbox size="small" checked={selected.has(item.id)} onChange={(_, checked) => updateSelection([item.id], checked)}
                  slotProps={{ input: { "aria-label": `Select ${item.ingredient_name}` } }} />
                <Box>
                  <Button onClick={() => void showDetails(item)} aria-haspopup="dialog"
                    sx={{ p: 0, minWidth: 0, textAlign: "left", color: "text.primary", fontWeight: 750 }}>{item.ingredient_name}</Button>
                  <Typography variant="body2" color="text.secondary">{[item.category, item.storage_location].filter(Boolean).join(" · ")}</Typography>
                </Box>
                <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap" sx={{ gridColumn: { xs: 2, md: "auto" } }}>
                  <Typography fontWeight={750} sx={{ fontVariantNumeric: "tabular-nums" }}>{item.quantity} {item.unit}</Typography>
                  {zero ? <Chip size="small" color="error" label="Out of stock" /> : reorder ? <Chip size="small" color="warning" label="Low stock" /> : reorderIds && <Chip size="small" variant="outlined" label="In stock" />}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ gridColumn: { xs: 2, md: "auto" } }}>
                  <Box component="span" sx={{ display: { md: "none" } }}>Reorder point: </Box>
                  {sameQuantity(item.reorder_point ?? "0", "0") ? "Not set" : `${item.reorder_point} ${item.unit}`}
                </Typography>
                <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ gridColumn: { xs: 2, md: "auto" } }}>
                  <Button size="small" variant="outlined" sx={{ minHeight: 44 }} aria-label={`Count stock for ${item.ingredient_name}`} onClick={() => openEditor("count", item)}>Count stock</Button>
                  {(reorder || zero) && <Button size="small" sx={{ minHeight: 44 }} aria-label={`Find produce for ${item.ingredient_name}`} onClick={() => setSource({ id: item.id })}>Find produce</Button>}
                </Stack>
              </Box>;
            })}
          </Box>
          <TablePagination component="div" count={filtered.length} page={activePage} rowsPerPage={pageSize}
            rowsPerPageOptions={[10, 25, 50, 100]} onPageChange={(_, next) => setPage(next)}
            onRowsPerPageChange={event => { setPageSize(Number(event.target.value)); setPage(0); }}
            sx={{ "& .MuiTablePagination-toolbar": { flexWrap: "wrap", justifyContent: "flex-end", px: 1 } }} />
        </>}
      </Paper>

      <Accordion disableGutters elevation={0} variant="outlined">
        <AccordionSummary id="inventory-import-toggle" aria-controls="inventory-import-panel" expandIcon={<WorkspaceIcon name="down" />}>Import inventory from CSV</AccordionSummary>
        <AccordionDetails>
          <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
            <Button variant="outlined" onClick={() => setCsvHelp(true)}>CSV help</Button>
            <Button variant="outlined" component="label" startIcon={<WorkspaceIcon name="upload" />}>
              {csv ? "Change CSV file" : "Choose CSV file"}
              <input type="file" hidden accept=".csv" onChange={event => {
                setCsv(event.currentTarget.files?.[0] ?? null);
                event.currentTarget.value = "";
              }} />
            </Button>
            <Button variant="contained" disabled={!csv || busy} onClick={() => void importCsv()}>Import inventory</Button>
          </Stack>
          {csv && <Typography sx={{ mt: 1, overflowWrap: "anywhere" }}>{csv.name}</Typography>}
          {importWarnings.length > 0 && <Alert severity="warning" sx={{ mt: 1 }}>
            Some CSV rows were skipped.<Box component="ul" sx={{ m: 0, pl: 2 }}>{importWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</Box>
          </Alert>}
        </AccordionDetails>
      </Accordion>
      <Accordion disableGutters elevation={0} variant="outlined">
        <AccordionSummary id="inventory-tools-toggle" aria-controls="inventory-tools-panel" expandIcon={<WorkspaceIcon name="down" />}>Advanced inventory tools</AccordionSummary>
        <AccordionDetails>
          <Typography color="text.secondary" sx={{ mb: 1 }}>These tools use the separate enhanced inventory workflow, not the kitchen stock list above.</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button variant="outlined" disabled={busy} onClick={() => void runAdvanced("optimization")}>Run optimization</Button>
            <Button variant="outlined" disabled={busy} onClick={() => void runAdvanced("orders")}>Run auto-order tool</Button>
            <Button variant="outlined" disabled={busy} onClick={() => void runAdvanced("alerts")}>Check priority alerts</Button>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>

    <Dialog open={editor !== null} onClose={() => { if (!busy) setEditor(null); }} fullWidth fullScreen={mobile}
      maxWidth="sm" aria-labelledby="inventory-editor-heading">
      {editor && <Box component="form" onSubmit={save} sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <DialogTitle id="inventory-editor-heading">{editorTitle}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {editorError && <Alert severity="error">{editorError}</Alert>}
            {count ? <>
              <Typography>Recorded stock: <strong>{editor.original?.quantity} {editor.original?.unit}</strong></Typography>
              <Typography color="text.secondary">Enter the total you counted, not the amount added or removed.</Typography>
              <TextField required autoFocus label={`New stock count (${editor.original?.unit})`} value={editor.draft.quantity}
                onChange={event => field("quantity", event.target.value)} slotProps={{ htmlInput: { inputMode: "decimal" } }} disabled={busy} />
              <TextField required label="Adjustment reason" placeholder="For example: physical count, spoilage, or waste" value={reason}
                onChange={event => setReason(event.target.value)} disabled={busy} />
            </> : <>
              <TextField required autoFocus label="Ingredient name" value={editor.draft.ingredient_name} disabled={busy}
                onChange={event => field("ingredient_name", event.target.value)} />
              {editor.mode === "add" && <TextField required label="Opening stock" value={editor.draft.quantity}
                onChange={event => field("quantity", event.target.value)} slotProps={{ htmlInput: { inputMode: "decimal" } }} disabled={busy} />}
              {(["unit", "category", "storage_location"] as const).map((key, index) =>
                <Autocomplete key={key} freeSolo options={suggestions[key]} inputValue={editor.draft[key]}
                  onInputChange={(_, value) => field(key, value)} disabled={busy || (key === "unit" && !!editor.original && !outOfStock(editor.original))}
                  renderInput={params => <TextField {...params} required label={["Unit", "Category", "Storage location"][index]}
                    helperText={key === "unit" && editor.original && !outOfStock(editor.original) ? "Units can only be changed when stock is zero." : undefined} />} />)}
              <TextField label="Reorder point" helperText="Leave blank or enter 0 to turn off reorder tracking."
                value={editor.draft.reorder_point} onChange={event => field("reorder_point", event.target.value)}
                slotProps={{ htmlInput: { inputMode: "decimal" } }} disabled={busy} />
              <TextField required type="date" label="Expiry date" value={editor.draft.expiry_date} disabled={busy}
                onChange={event => field("expiry_date", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setEditor(null)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving..." : count ? "Save stock count" : "Save ingredient"}</Button>
        </DialogActions>
      </Box>}
    </Dialog>

    <Dialog open={detail !== null} onClose={closeDetails} fullWidth maxWidth="sm" aria-labelledby="inventory-detail-heading">
      {detail && <>
        <DialogTitle id="inventory-detail-heading">{detail.ingredient_name}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography>{detail.category} · {detail.storage_location}</Typography>
            <Typography>On hand: <strong>{detail.quantity} {detail.unit}</strong></Typography>
            <Typography>Expiry date: {localDate(detail.expiry_date)}</Typography>
            <Typography component="h2" variant="h6">Stock movement history</Typography>
            {historyState === "loading" && <CircularProgress size={24} aria-label="Loading stock history" />}
            {historyState === "error" && <Alert severity="error" action={<Button color="inherit" onClick={() => void showDetails(detail)}>Retry</Button>}>Could not load stock history.</Alert>}
            {historyState === "ready" && history.length === 0 && <Typography color="text.secondary">No stock movements recorded.</Typography>}
            {history.map(movement => <Box key={movement.id} sx={{ borderTop: 1, borderColor: "divider", pt: 1 }}>
              <Typography fontWeight={650} sx={{ textTransform: "capitalize" }}>{movement.movement_type.replace(/_/g, " ")} · {movement.quantity_change} {movement.unit}</Typography>
              <Typography variant="body2">{movement.quantity_before} → {movement.quantity_after} {movement.unit} · {movement.reason}</Typography>
              <Typography variant="caption" color="text.secondary">{new Date(movement.created_at).toLocaleString()}{movement.sale_id ? ` · Sale #${movement.sale_id}` : ""}</Typography>
            </Box>)}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap" }}>
          <Button color="error" onClick={() => { closeDetails(); confirmDelete([detail]); }}>Delete ingredient</Button>
          <Button onClick={() => { closeDetails(); openEditor("details", detail); }}>Edit ingredient</Button>
          <Button onClick={closeDetails}>Close</Button>
        </DialogActions>
      </>}
    </Dialog>

    <Dialog open={remove !== null} onClose={() => { if (!busy) setRemove(null); }} aria-labelledby="inventory-delete-heading">
      <DialogTitle id="inventory-delete-heading">Delete {remove?.length === 1 ? remove[0].ingredient_name : `${remove?.length ?? 0} ingredients`}?</DialogTitle>
      <DialogContent>
        <Typography>Ingredients used in recipes or with recorded stock movements cannot be deleted.</Typography>
        {removeError && <Alert severity="error" sx={{ mt: 1, whiteSpace: "pre-line" }}>{removeError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => setRemove(null)}>Cancel</Button>
        <Button color="error" disabled={busy} onClick={() => void deleteSelected()}>{busy ? "Deleting..." : "Delete"}</Button>
      </DialogActions>
    </Dialog>

    <CSVHelpDialog open={csvHelp} onClose={() => setCsvHelp(false)} uploadType="inventory" />
    <ProduceOrderDialog open={source !== null} initialInventoryItemId={source?.id} onClose={() => setSource(null)}
      onSuccess={result => setNotice({ text: result.message, severity: "success" })}
      onError={error => setNotice({ text: `Order failed: ${error}`, severity: "error" })} />
    <Snackbar open={notice !== null} autoHideDuration={4500} onClose={() => setNotice(null)}>
      {notice ? <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.text}</Alert> : undefined}
    </Snackbar>
  </Box>;
}
