import React, { useState } from "react";
import { getGeneratedMenuSmart } from "../api/menu";
import { CardContent, Typography, CircularProgress, List, ListItem, ListItemText, Button, Snackbar, Alert, Divider } from "@mui/material";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MenuManagerProps {
  refreshKey: number;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
}

const MenuManager:React.FC<MenuManagerProps> = ({ refreshKey, setRefreshKey }) => {
    const [smartMenu, setSmartMenu] = useState<any[]>([]);
    const [smartLoading, setSmartLoading] = useState(false);
    const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);

    const showSnackbar = (message: string, severity: "success" | "error") => setSnackbar({ message, severity });

    const handleGenerateSmartMenu = async () => {
        setSmartLoading(true);
        try {
        const data = await getGeneratedMenuSmart();
        setSmartMenu(data.dishes);
        setRefreshKey(prev => prev + 1);
        showSnackbar("Menu generated!", "success");
        } catch (err: any) {
        showSnackbar(err.message || "Failed to generate menu", "error");
        } finally {
        setSmartLoading(false);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Smart Menu", 14, 16);

        autoTable(doc, {
            startY: 22,
            head: [["Dish Name", "Servings", "Popularity"]],
            body: smartMenu.map(item => [
                item.name,
                item.servings,
                item.popularity_score
            ]),
        });

        doc.save("smart_menu.pdf");
    };

   return (
    <CardContent key={refreshKey}>
        <Typography variant="h5" fontWeight={600} gutterBottom color="primary">
           Smart Menu
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
           Generate a menu based on current inventory and dish popularity.
        </Typography>
        <Button
            variant="outlined"
            onClick={handleExportPDF}
            sx={{ mb: 2, ml: 2 }}
            disabled={smartMenu.length === 0}
        >
             Export as PDF
        </Button>

        <Divider sx={{ my: 3 }} />
        <Button variant="contained" onClick={handleGenerateSmartMenu} sx={{ mb: 2 }}>
            Generate Menu
        </Button>
        {smartLoading ? (
            <CircularProgress />
        ) : (
            <List dense>
            {smartMenu.map((item, i) => (
                <ListItem key={i}>
                <ListItemText
                    primary={`${item.name}`}
                    secondary={`Servings: ${item.servings}, Popularity: ${item.popularity_score}`}
                    />
                </ListItem>
            ))}
            </List>
        )}
        <Snackbar
          open={!!snackbar}
          autoHideDuration={3000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>
            {snackbar?.message}
          </Alert>
        </Snackbar>
    </CardContent>
  );
};

export default MenuManager;
