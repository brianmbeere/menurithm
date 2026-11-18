import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button, Checkbox, Chip,
  CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Snackbar, Stack,
  TablePagination, TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { Link } from "react-router-dom";
import { fetchDishes, type Dish } from "../api/fetchDishes";
import { createDish, type DishInput } from "../api/createDish";
import { updateDish } from "../api/updateDish";
import deleteDish from "../api/deleteDish";
import fetchInventory from "../api/fetchInventory";
import type { InventoryItem } from "../api/updateInventory";
import uploadDishesFile from "../api/uploadDishesFile";
import CSVHelpDialog from "./CSVHelpDialog";
import { PageHeading, WorkspaceIcon } from "./WorkspaceUI";

type Line = { key: number; ingredientId: number | null; quantity: string; unit: string };
type Draft = { id?: number; name: string; description: string; yield: string; lines: Line[]; review: boolean };
type View = "all" | "review";
const positiveDecimal = (value: string) =>
  /^(?:\d{1,15}(?:\.\d{0,9})?|\.\d{1,9})$/.test(value.replace(/^0+(?=\d)/, "")) && Number(value) > 0;
const needsReview = (dish: Dish, inventory: Map<number, InventoryItem> | null) =>
  !(Number(dish.recipe_yield) > 0) || !dish.ingredients.length || dish.ingredients.some(line =>
    line.quantity_decimal == null || !(Number(line.quantity_decimal) > 0) || !line.unit?.trim() ||
    (inventory !== null && !inventory.has(line.ingredient_id)));
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const previewQuantity = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 });

export default function DishManager() {
  const mobile = useMediaQuery(useTheme().breakpoints.down("sm"));
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [stock, setStock] = useState<InventoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dishError, setDishError] = useState("");
  const [stockError, setStockError] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("all");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [selected, setSelected] = useState(new Set<number>());
  const [detail, setDetail] = useState<Dish | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const [remove, setRemove] = useState<Dish[] | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState<File | null>(null);
  const [csvHelp, setCsvHelp] = useState(false);
  const [importError, setImportError] = useState("");
  const [notice, setNotice] = useState("");
  const lineKey = useRef(0);

  async function refresh() {
    setLoading(true);
    setDishError("");
    setStockError("");
    const [recipes, inventory] = await Promise.allSettled([fetchDishes(), fetchInventory()]);
    if (recipes.status === "fulfilled") setDishes(recipes.value);
    else setDishError(errorText(recipes.reason, "Could not load dishes."));
    if (inventory.status === "fulfilled") setStock(inventory.value);
    else {
      setStock(null);
      setStockError(errorText(inventory.reason, "Could not load inventory."));
    }
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  const stockById = stock && new Map(stock.map(item => [item.id, item]));
  const ingredientName = (line: Dish["ingredients"][number]) =>
    stockById?.get(line.ingredient_id)?.ingredient_name || line.ingredient_name || `Ingredient #${line.ingredient_id}`;
  const review = (dish: Dish) => needsReview(dish, stockById);
  const query = search.trim().toLowerCase();
  const filtered = dishes.filter(dish =>
    (view === "all" || review(dish)) &&
    [dish.name, dish.description, ...dish.ingredients.map(ingredientName)].some(value => value?.toLowerCase().includes(query)),
  ).sort((a, b) => a.name.localeCompare(b.name));
  const activePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / size) - 1));
  const visible = filtered.slice(activePage * size, (activePage + 1) * size);
  const selectedDishes = dishes.filter(dish => selected.has(dish.id));
  const visibleSelected = visible.filter(dish => selected.has(dish.id)).length;

  function setFilter(next: View, term: string) {
    setView(next);
    setSearch(term);
    setPage(0);
    setSelected(new Set());
  }

  function select(ids: number[], checked: boolean) {
    setSelected(previous => {
      const next = new Set(previous);
      for (const id of ids) checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function blankLine(): Line {
    return { key: ++lineKey.current, ingredientId: null, quantity: "", unit: "" };
  }

  function edit(dish?: Dish) {
    setDetail(null);
    setFormError("");
    setDraft({
      id: dish?.id, name: dish?.name ?? "", description: dish?.description ?? "",
      yield: dish?.recipe_yield == null ? "" : String(dish.recipe_yield), review: !!dish && review(dish),
      lines: dish?.ingredients.length ? dish.ingredients.map(line => ({
        key: ++lineKey.current, ingredientId: line.ingredient_id,
        quantity: String(line.quantity_decimal ?? line.quantity), unit: line.unit ?? "",
      })) : [blankLine()],
    });
  }

  function changeLine(key: number, patch: Partial<Line>) {
    setDraft(current => current && ({ ...current, lines: current.lines.map(line => line.key === key ? { ...line, ...patch } : line) }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy || stock === null) return;
    setFormError("");
    if (!draft.name.trim()) return setFormError("Enter a dish name.");
    if (!positiveDecimal(draft.yield.trim())) return setFormError("Enter a positive batch yield with up to 15 whole-number digits and 9 decimal places.");
    const ingredients: DishInput["ingredients"] = [];
    for (const [index, line] of draft.lines.entries()) {
      if (line.ingredientId === null || !stockById?.has(line.ingredientId) || !positiveDecimal(line.quantity.trim()) || !line.unit.trim()) {
        return setFormError(`Ingredient ${index + 1}: choose an inventory item, enter a positive quantity with up to 15 whole-number digits and 9 decimal places, and specify a unit.`);
      }
      ingredients.push({ ingredient_id: line.ingredientId, quantity: line.quantity.trim(), unit: line.unit.trim() });
    }
    if (!ingredients.length) return setFormError("Add at least one ingredient.");
    setBusy(true);
    try {
      const payload: DishInput = { name: draft.name.trim(), description: draft.description.trim(), recipe_yield: draft.yield.trim(), ingredients };
      const saved = draft.id === undefined ? await createDish(payload) : await updateDish(draft.id, payload);
      setDishes(previous => draft.id === undefined ? [...previous, saved] : previous.map(dish => dish.id === draft.id ? saved : dish));
      setDraft(null);
      setNotice(draft.id === undefined ? "Dish added." : "Recipe saved.");
    } catch (error) {
      setFormError(errorText(error, "Could not save this recipe."));
    } finally { setBusy(false); }
  }

  function confirmDelete(targets: Dish[]) {
    setDetail(null);
    setDeleteError("");
    setRemove(targets);
  }

  async function deleteSelected() {
    if (!remove || busy) return;
    setBusy(true);
    setDeleteError("");
    const results = await Promise.allSettled(remove.map(dish => deleteDish(dish.id)));
    const deleted = new Set(remove.filter((_, index) => results[index].status === "fulfilled").map(dish => dish.id));
    const failed = remove.filter(dish => !deleted.has(dish.id));
    setDishes(previous => previous.filter(dish => !deleted.has(dish.id)));
    select([...deleted], false);
    setRemove(failed.length ? failed : null);
    if (failed.length) setDeleteError(results.flatMap((result, index) => result.status === "rejected"
      ? [`${remove[index].name}: ${errorText(result.reason, "Could not delete dish.")}`] : []).join("\n"));
    if (deleted.size) setNotice(`${deleted.size} ${deleted.size === 1 ? "dish" : "dishes"} deleted.`);
    setBusy(false);
  }

  async function importCsv() {
    if (!csv || busy) return;
    setBusy(true);
    setImportError("");
    try {
      const result = await uploadDishesFile(csv);
      setCsv(null);
      setNotice(result.summary ?? "Dishes imported.");
      await refresh();
    } catch (error) {
      setImportError(errorText(error, "Could not import dishes."));
    } finally { setBusy(false); }
  }

  return <Box>
    <PageHeading icon="dishes" title="Dishes & recipes" description="Browse your dishes, build batch recipes, and link their ingredients to kitchen inventory."
      actions={<Button variant="contained" startIcon={<WorkspaceIcon name="add" />} onClick={() => edit()}>Add dish</Button>} />
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button variant={view === "all" ? "contained" : "outlined"} aria-pressed={view === "all"} onClick={() => setFilter("all", search)}>
              All dishes {!loading && !dishError && `(${dishes.length})`}
            </Button>
            <Button variant={view === "review" ? "contained" : "outlined"} aria-pressed={view === "review"} onClick={() => setFilter("review", search)}>
              Needs recipe review {!loading && !dishError && `(${dishes.filter(review).length})`}
            </Button>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
            <TextField fullWidth size="small" label="Search dishes" placeholder="Dish name, description, or ingredient"
              value={search} onChange={event => setFilter(view, event.target.value)} />
            <Button onClick={() => void refresh()} disabled={loading || busy}>Refresh</Button>
          </Stack>
          {(dishError || stockError) && <Alert severity={dishError ? "error" : "warning"}>{dishError || `${stockError} Inventory links cannot be checked right now.`}</Alert>}
          {selectedDishes.length > 0 && <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Typography role="status">{selectedDishes.length} selected</Typography>
            <Button color="error" onClick={() => confirmDelete(selectedDishes)}>Delete selected</Button>
            <Button onClick={() => setSelected(new Set())}>Clear selection</Button>
          </Stack>}
          {loading && <CircularProgress size={24} aria-label="Loading recipes" />}
          {!loading && !dishError && visible.length === 0 && <Stack alignItems="flex-start" spacing={1}>
            <Typography component="h2" variant="h6">{dishes.length ? "No dishes match this view" : "No dishes yet"}</Typography>
            <Typography color="text.secondary">{dishes.length ? "Try a different search or show all dishes." : "Add a dish or import recipes from CSV."}</Typography>
            {dishes.length > 0 && <Button onClick={() => setFilter("all", "")}>Clear filters</Button>}
          </Stack>}
        </Stack>
        {visible.length > 0 && <>
          <Stack direction="row" alignItems="center" sx={{ bgcolor: "background.default", px: 1.5 }}>
            <Checkbox size="small" checked={visibleSelected === visible.length} indeterminate={visibleSelected > 0 && visibleSelected < visible.length}
              onChange={(_, checked) => select(visible.map(dish => dish.id), checked)}
              slotProps={{ input: { "aria-label": "Select dishes on this page" } }} />
            <Typography variant="caption" fontWeight={700}>Dish library</Typography>
          </Stack>
          <Box component="ul" aria-label="Dish library" sx={{ listStyle: "none", p: 0, m: 0 }}>
            {visible.map(dish => <Box component="li" key={dish.id} sx={{ display: "grid", gap: 1,
              gridTemplateColumns: { xs: "auto minmax(0, 1fr)", sm: "auto minmax(0, 1fr) auto" }, alignItems: "center",
              p: 1.5, borderTop: 1, borderColor: "divider", overflowWrap: "anywhere",
              bgcolor: selected.has(dish.id) ? "action.selected" : undefined }}>
              <Checkbox size="small" checked={selected.has(dish.id)} onChange={(_, checked) => select([dish.id], checked)}
                slotProps={{ input: { "aria-label": `Select ${dish.name}` } }} />
              <Box>
                <Button aria-haspopup="dialog" onClick={() => setDetail(dish)} sx={{ p: 0, minWidth: 0, textAlign: "left", color: "text.primary", fontWeight: 750 }}>{dish.name}</Button>
                {dish.description && <Typography variant="body2" color="text.secondary" noWrap>{dish.description}</Typography>}
                <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">{Number(dish.recipe_yield) > 0 ? `${dish.recipe_yield} servings per batch` : "Yield not set"} · {dish.ingredients.length} {dish.ingredients.length === 1 ? "ingredient" : "ingredients"}</Typography>
                  {review(dish) && <Chip size="small" color="warning" label="Needs recipe review" />}
                </Stack>
              </Box>
              <Button variant="outlined" size="small" aria-label={`Edit recipe for ${dish.name}`} onClick={() => edit(dish)}
                sx={{ gridColumn: { xs: 2, sm: "auto" }, justifySelf: "start" }}>Edit recipe</Button>
            </Box>)}
          </Box>
          <TablePagination component="div" count={filtered.length} page={activePage} rowsPerPage={size} rowsPerPageOptions={[10, 25, 50]}
            onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={event => { setSize(Number(event.target.value)); setPage(0); }}
            sx={{ "& .MuiTablePagination-toolbar": { flexWrap: "wrap", justifyContent: "flex-end", px: 1 } }} />
        </>}
      </Paper>
      <Accordion variant="outlined" disableGutters elevation={0}>
        <AccordionSummary id="dish-import-toggle" aria-controls="dish-import-panel" expandIcon={<WorkspaceIcon name="down" />}>Import dishes from CSV</AccordionSummary>
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
            <Button variant="contained" disabled={!csv || busy} onClick={() => void importCsv()}>Import dishes</Button>
          </Stack>
          {csv && <Typography sx={{ mt: 1, overflowWrap: "anywhere" }}>{csv.name}</Typography>}
          {importError && <Alert severity="error" sx={{ mt: 1 }}>{importError}</Alert>}
        </AccordionDetails>
      </Accordion>
    </Stack>

    <Dialog open={detail !== null} onClose={() => setDetail(null)} fullWidth maxWidth="sm" aria-labelledby="recipe-detail-title">
      {detail && <>
        <DialogTitle id="recipe-detail-title">{detail.name}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {detail.description && <Typography color="text.secondary">{detail.description}</Typography>}
            <Typography>Batch yield: <strong>{Number(detail.recipe_yield) > 0 ? `${detail.recipe_yield} servings` : "Not set"}</strong></Typography>
            {review(detail) && <Alert severity="warning">Review the batch yield and ingredient quantities before relying on this recipe for stock deductions.</Alert>}
            <Typography component="h2" variant="h6">Batch ingredients</Typography>
            {!detail.ingredients.length && <Typography color="text.secondary">No ingredients recorded.</Typography>}
            <Stack component="ul" spacing={1} sx={{ listStyle: "none", m: 0, p: 0 }}>
              {detail.ingredients.map((line, index) => <Box component="li" key={index} sx={{ borderTop: 1, borderColor: "divider", pt: 1, overflowWrap: "anywhere" }}>
                <Typography fontWeight={650}>{ingredientName(line)}</Typography>
                <Typography variant="body2" color="text.secondary">{line.quantity_decimal ?? line.quantity} {line.unit}
                  {line.quantity_decimal != null && Number(detail.recipe_yield) > 0 && ` · approx. ${previewQuantity.format(Number(line.quantity_decimal) / Number(detail.recipe_yield))} ${line.unit} per serving`}</Typography>
              </Box>)}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap" }}>
          <Button color="error" onClick={() => confirmDelete([detail])}>Delete dish</Button>
          <Button onClick={() => setDetail(null)}>Close</Button>
          <Button variant="contained" onClick={() => edit(detail)}>Edit recipe</Button>
        </DialogActions>
      </>}
    </Dialog>

    <Dialog open={draft !== null} onClose={() => { if (!busy) setDraft(null); }} fullScreen={mobile}
      fullWidth maxWidth="md" aria-labelledby="recipe-editor-title">
      {draft && <Box component="form" onSubmit={save} sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <DialogTitle id="recipe-editor-title">{draft.id === undefined ? "Add dish" : "Edit recipe"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {formError && <Alert severity="error">{formError}</Alert>}
            {draft.review && <Alert severity="warning">Check the yield and batch quantities before saving. Older quantities may not have been recorded per serving.</Alert>}
            {loading ? <CircularProgress size={24} aria-label="Loading inventory ingredients" /> : stock === null
              ? <Alert severity="error" action={<Button onClick={() => void refresh()} color="inherit">Retry</Button>}>Inventory ingredients could not be loaded.</Alert>
              : !stock.length && <Alert severity="info" action={<Button component={Link} to="/dashboard/inventory" color="inherit">Open inventory</Button>}>Add ingredients to Inventory before building a recipe.</Alert>}
            <TextField required autoFocus label="Dish name" value={draft.name} disabled={busy}
              onChange={event => { const name = event.target.value; setDraft(current => current && { ...current, name }); }} />
            <TextField label="Description" multiline minRows={2} value={draft.description} disabled={busy}
              onChange={event => { const description = event.target.value; setDraft(current => current && { ...current, description }); }} />
            <TextField required label="Servings per batch" helperText="How many servings do the ingredient amounts below make?" value={draft.yield} disabled={busy}
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
              onChange={event => { const value = event.target.value; setDraft(current => current && { ...current, yield: value }); }} />
            <Stack spacing={0.5}>
              <Typography component="h2" variant="h6">Batch ingredients</Typography>
              <Typography variant="body2" color="text.secondary">Enter the amount for the whole batch. Menurithm divides it by the yield when processing sales.</Typography>
            </Stack>
            {draft.lines.map((line, index) => {
              const linked = line.ingredientId === null ? undefined : stockById?.get(line.ingredientId);
              const perServing = positiveDecimal(draft.yield) && positiveDecimal(line.quantity)
                ? previewQuantity.format(Number(line.quantity) / Number(draft.yield)) : null;
              return <Paper variant="outlined" key={line.key} sx={{ p: 1.5 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography fontWeight={650}>Ingredient {index + 1}</Typography>
                    <Button size="small" color="error" disabled={busy} aria-label={`Remove ingredient ${index + 1}`}
                      onClick={() => setDraft(current => current && ({ ...current, lines: current.lines.filter(item => item.key !== line.key) }))}>Remove</Button>
                  </Stack>
                  <Autocomplete options={stock ?? []} value={linked ?? null} disabled={busy || !stock?.length}
                    getOptionLabel={item => item.ingredient_name} isOptionEqualToValue={(a, b) => a.id === b.id}
                    onChange={(_, item) => changeLine(line.key, { ingredientId: item?.id ?? null, unit: item?.unit ?? "" })}
                    renderInput={params => <TextField {...params} label="Inventory ingredient" required
                      error={stock !== null && line.ingredientId !== null && !linked}
                      helperText={linked ? `Tracked in inventory as ${linked.unit}` : stock !== null && line.ingredientId !== null ? "Choose a replacement inventory ingredient." : undefined} />} />
                  <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                    <TextField fullWidth required label="Batch quantity" value={line.quantity} disabled={busy}
                      slotProps={{ htmlInput: { inputMode: "decimal" } }} onChange={event => changeLine(line.key, { quantity: event.target.value })} />
                    <TextField fullWidth required label="Recipe unit" value={line.unit} disabled={busy}
                      onChange={event => changeLine(line.key, { unit: event.target.value })} />
                  </Stack>
                  {perServing && line.unit.trim() && <Typography variant="body2" color="text.secondary">Approx. {perServing} {line.unit.trim()} per serving</Typography>}
                </Stack>
              </Paper>;
            })}
            <Button sx={{ alignSelf: "flex-start" }} disabled={busy || !stock?.length} startIcon={<WorkspaceIcon name="add" />}
              onClick={() => { const line = blankLine(); setDraft(current => current && ({ ...current, lines: [...current.lines, line] })); }}>Add ingredient</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setDraft(null)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy || loading || !stock?.length}>{busy ? "Saving..." : "Save recipe"}</Button>
        </DialogActions>
      </Box>}
    </Dialog>

    <Dialog open={remove !== null} onClose={() => { if (!busy) setRemove(null); }} aria-labelledby="recipe-delete-title">
      {remove && <>
        <DialogTitle id="recipe-delete-title">Delete {remove.length === 1 ? remove[0].name : `${remove.length} dishes`}?</DialogTitle>
        <DialogContent>
          <Typography>This removes the dish and its recipe. This action cannot be undone.</Typography>
          {deleteError && <Alert severity="error" sx={{ mt: 1, whiteSpace: "pre-line" }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemove(null)} disabled={busy}>Cancel</Button>
          <Button color="error" onClick={() => void deleteSelected()} disabled={busy}>{busy ? "Deleting..." : "Delete"}</Button>
        </DialogActions>
      </>}
    </Dialog>
    <CSVHelpDialog open={csvHelp} onClose={() => setCsvHelp(false)} uploadType="dishes" />
    <Snackbar open={!!notice} autoHideDuration={4500} onClose={() => setNotice("")}>
      <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>
    </Snackbar>
  </Box>;
}
