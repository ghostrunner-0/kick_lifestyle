"use client";

import React, { useState, useEffect } from "react";
import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  Typography,
  Stack,
  Divider,
  CircularProgress,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Edit as EditIcon, X as CloseIcon } from "lucide-react";
import { showToast } from "@/lib/ShowToast";
import axios from "axios";

const statusColors = {
  approved: "success",
  unapproved: "warning",
  spam: "error",
};

const ViewReview = ({ id }) => {
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    axios
      .get(`/api/reviews/${id}`)
      .then((res) => {
        if (res.data.success) {
          setReview(res.data.data);
        } else {
          showToast("error", res.data.message || "Failed to load review data");
        }
      })
      .catch(() => showToast("error", "Failed to load review data"))
      .finally(() => setLoading(false));
  }, [open, id]);

  const updateStatus = async (newStatus) => {
    setLoading(true);
    try {
      const res = await axios.put(`/api/reviews/${id}`, {
        status: newStatus,
      });

      if (res.data.success) {
        setReview((prev) => ({ ...prev, status: newStatus }));
        showToast("success", "Review status updated");
      } else {
        showToast("error", res.data.message || "Failed to update review status");
      }
    } catch {
      showToast("error", "Failed to update review status");
    } finally {
      setLoading(false);
    }
  };

  if (!id) return null;

  return (
    <>
      <MenuItem
        onClick={() => setOpen(true)}
        key="view-review"
        disabled={loading}
      >
        <ListItemIcon>
          <EditIcon size={18} />
        </ListItemIcon>
        <ListItemText primary="View / Edit Review" />
      </MenuItem>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Review Details & Status
          <IconButton
            aria-label="close"
            onClick={() => setOpen(false)}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loading && (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress />
            </Box>
          )}

          {!loading && review && (
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={600}>
                {review.title}
              </Typography>

              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {review.review}
              </Typography>

              <Divider />

              <Typography variant="subtitle1">
                <strong>Rating:</strong> {review.rating} / 5
              </Typography>

              <Typography
                variant="subtitle1"
                sx={{ display: "flex", alignItems: "center" }}
              >
                <strong>Status:&nbsp;</strong>
                <Box
                  component="span"
                  sx={{
                    textTransform: "capitalize",
                    color: (theme) =>
                      theme.palette[statusColors[review.status]]?.main ||
                      "text.primary",
                    fontWeight: "bold",
                  }}
                >
                  {review.status}
                </Box>
              </Typography>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
          <Stack direction="row" spacing={2}>
            {["approved", "unapproved", "spam"].map((status) => (
              <Button
                key={status}
                variant={review?.status === status ? "contained" : "outlined"}
                color={statusColors[status]}
                onClick={() => updateStatus(status)}
                disabled={loading || review?.status === status}
                size="small"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </Stack>

          <Button onClick={() => setOpen(false)} disabled={loading} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ViewReview;
