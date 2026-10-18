import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import ProduceOrders from './ProduceOrders';

interface ProduceOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: { request_id: number; message: string }) => void;
  onError: (error: string) => void;
}

export const ProduceOrderDialog = ({ open, onClose, onSuccess }: ProduceOrderDialogProps) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="produce-order-title">
    <DialogTitle id="produce-order-title">Source fresh produce</DialogTitle>
    <DialogContent>
      {open && <ProduceOrders onCreated={order => onSuccess({
        request_id: order.request_id, message: 'Request sent. Review and accept the farmer quote in Produce orders.',
      })} />}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
  </Dialog>
);

export default ProduceOrderDialog;
