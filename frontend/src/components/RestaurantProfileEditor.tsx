import { useEffect, useState, type FormEvent } from "react";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { accountRequest, loadRestaurantProfile, type RestaurantProfile } from "../api/restaurantProfile";

const addressFields = [
  ["street", "Street address", "address-line1", 150],
  ["suite", "Suite / unit (optional)", "address-line2", 150],
  ["city", "City", "address-level2", 150],
  ["region", "State / region", "address-level1", 150],
  ["postal_code", "ZIP / postal code", "postal-code", 24],
  ["country", "Country", "country-name", 150],
] as const;

export default function RestaurantProfileEditor() {
  const [profile, setProfile] = useState<RestaurantProfile>();
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    loadRestaurantProfile().then(value => { if (active) setProfile(value); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "Could not load your profile."); });
    return () => { active = false; };
  }, [reload]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile || busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      setProfile(await accountRequest<RestaurantProfile>("restaurant-profile", "PUT", profile));
      setSaved(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your profile.");
    } finally { setBusy(false); }
  };
  const field = (key: keyof RestaurantProfile, label: string, autoComplete: string, maxLength: number, required = false) =>
    <TextField key={key} label={label} autoComplete={autoComplete} value={profile?.[key] ?? ""}
      required={required} disabled={busy} slotProps={{ htmlInput: { maxLength } }}
      onChange={event => {
        setSaved(false);
        setProfile(current => current && ({ ...current, [key]: event.target.value }));
      }} />;

  return <Card variant="outlined" component="section" aria-labelledby="restaurant-profile" sx={{ gridColumn: "1 / -1" }}>
    <CardContent>
      <Typography id="restaurant-profile" component="h2" variant="h6">Restaurant profile</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Update the name and delivery address used for produce requests.</Typography>
      <Stack spacing={2} component="form" onSubmit={save}>
        {error && <Alert severity="error">{error}</Alert>}
        {saved && <Alert severity="success">Profile saved.</Alert>}
        {!profile ? error
          ? <Box><Button onClick={() => { setError(""); setReload(value => value + 1); }}>Retry</Button></Box>
          : <Typography role="status">Loading profile…</Typography>
          : <>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
              {field("full_name", "Contact name", "name", 150, true)}
              {field("restaurant_name", "Restaurant name", "organization", 150)}
            </Box>
            <Box>
              <Typography component="h3" variant="subtitle1" fontWeight={700}>Saved delivery address</Typography>
              <Typography variant="body2" color="text.secondary">Optional. Fill in the required address fields to save a location, or leave them all blank.</Typography>
            </Box>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
              {addressFields.map(([key, label, autoComplete, maxLength]) =>
                field(key, label, autoComplete, maxLength, key !== "suite" && addressFields.some(([field]) => profile[field].trim())))}
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
              {addressFields.some(([key]) => profile[key]) && <Button disabled={busy} onClick={() => {
                setSaved(false);
                setProfile({ ...profile, street: "", suite: "", city: "", region: "", postal_code: "", country: "" });
              }}>Clear address</Button>}
            </Stack>
          </>}
      </Stack>
    </CardContent>
  </Card>;
}
