import React, { useState } from "react";
import { getGeneratedMenuSmart } from "../api/menu";
import {
  Card,
  CardContent,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Button,
  Snackbar,
  Alert,
  Divider,
} from "@mui/material";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";

interface MenuManagerProps {
  refreshKey: number;
  setRefreshKey: React.Dispatch<React.SetStateAction<number>>;
}

const MenuManager: React.FC<MenuManagerProps> = ({ }) => {
  const [smartMenu, setSmartMenu] = useState<any[]>([]);
  const [smartLoading, setSmartLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  const showSnackbar = (message: string, severity: "success" | "error") =>
    setSnackbar({ message, severity });

  const handleGenerateSmartMenu = async () => {
    setSmartLoading(true);
    try {
      const data = await getGeneratedMenuSmart();
      // Fix: If API returns { dishes: [...] }, use data.dishes; else use data directly
      const menu = Array.isArray(data) ? data : (data?.dishes || []);
      setSmartMenu(menu);
      showSnackbar("Menu generated successfully!", "success");
    } catch (err) {
      showSnackbar("Failed to generate menu.", "error");
    } finally {
      setSmartLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Restaurant Menu", 14, 20);
    const tableData = smartMenu.map((item) => [item.name, item.popularity_score, item.servings]);
    autoTable(doc, {
      head: [["Dish", "Popularity Score", "Servings"]],
      body: tableData,
      startY: 30,
    });
    doc.save("menu.pdf");
  };

  return (
    <motion.div
      className="p-6 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileInView={{ opacity: 1 }}
    >
      <Card elevation={3} className="mb-6" sx={{ }}>
        <CardContent>
          <Typography variant="h5" className="mb-4">
            Smart Menu Generator
          </Typography>
          <Button
            variant="contained"
            onClick={handleGenerateSmartMenu}
            disabled={smartLoading}
            className="mr-4"
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

      <Divider className="mb-12" />

      {smartMenu.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Generated Menu
            </Typography>
            <Divider className="mb-4" />
            <List>
              {smartMenu.map((item, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={item.name}
                    secondary={`Popularity Score: ${item.popularity_score}, Servings: ${item.servings}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

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
