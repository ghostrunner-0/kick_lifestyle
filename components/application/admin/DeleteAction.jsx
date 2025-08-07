import React from "react";
import { Delete } from "lucide-react";
import { MenuItem, ListItemIcon, ListItemText } from "@mui/material";

const DeleteAction = ({ handleDelete, row, deleteType }) => {
  return (
    <MenuItem
      key="delete"
      onClick={() => handleDelete([row.original._id], deleteType)}
    >
      <ListItemIcon>
        <Delete />
      </ListItemIcon>
      <ListItemText primary="Delete" />
    </MenuItem>
  );
};

export default DeleteAction;
