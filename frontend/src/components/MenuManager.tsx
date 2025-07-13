import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Grid,
  CardMedia,
  Button,
  Snackbar,
  Alert,
  Chip,
  Divider,
  Box,
} from "@mui/material";
import { getGeneratedMenuSmart } from "../api/menu";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MenuItem {
  name: string;
  popularity_score: number;
  servings: number;
  description?: string;
  tags?: string[];
}

const MenuManager: React.FC = () => {
  const [smartMenu, setSmartMenu] = useState<MenuItem[]>([]);
  const [smartLoading, setSmartLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);

  const showSnackbar = (message: string, severity: "success" | "error") =>
    setSnackbar({ message, severity });

  const handleGenerateSmartMenu = async () => {
    setSmartLoading(true);
    try {
      const data = await getGeneratedMenuSmart();
      const menu = Array.isArray(data) ? data : data?.dishes || [];
      setSmartMenu(menu);
      showSnackbar("Menu generated successfully!", "success");
    } catch {
      showSnackbar("Failed to generate menu.", "error");
    } finally {
      setSmartLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Generated Menu", 14, 20);
    const tableData = smartMenu.map((item) => [item.name, item.popularity_score, item.servings]);
    autoTable(doc, {
      head: [["Dish", "Popularity Score", "Servings"]],
      body: tableData,
      startY: 30,
    });
    doc.save("menu.pdf");
  };

  return (
    <motion.div className="p-6 max-w-6xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Top Bar */}
      <Card elevation={3} className="mb-6">
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Smart Menu Generator
          </Typography>
          <Button
            variant="contained"
            onClick={handleGenerateSmartMenu}
            disabled={smartLoading}
            sx={{ mr: 2 }}
          >
            {smartLoading ? <CircularProgress size={24} /> : "Generate Menu"}
          </Button>
          {smartMenu.length > 0 && (
            <Button variant="outlined" onClick={exportPDF}>
              Export PDF
            </Button>
          )}
        </CardContent>
      </Card>

      <Divider className="mb-6" />

      {/* Menu Grid */}
      {smartMenu.length > 0 && (
        <Grid container spacing={4}>
          {smartMenu.map((item, index) => (
            <Grid sx={{xs:12, sm:6}} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card elevation={2} sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  {/* Dish Image or Icon */}
                  {/** Assume image exists in /public/images/dishes/ */}
                  <CardMedia
                    component="img"
                    height="160"
                    image={`./placeholder-food.jpg`}
                    alt={item.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "./placeholder-food.jpg";
                    }}
                  />
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {item.description || "A delightful signature dish prepared with fresh ingredients."}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                      <Chip label={`Score: ${item.popularity_score}`} size="small" color="primary" />
                      <Chip label={`Servings: ${item.servings}`} size="small" color="secondary" />
                      {(item.tags || ["Popular", "Chef's Pick"]).map((tag, i) => (
                        <Chip key={i} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Snackbar */}
      {snackbar && (
        <Snackbar
          open={!!snackbar}
          autoHideDuration={4000}
          onClose={() => setSnackbar(null)}
        >
          <Alert
            onClose={() => setSnackbar(null)}
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </motion.div>
  );
};

export default MenuManager;
