import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationProvider, useNotification } from "./NotificationContext";

const Trigger = ({ onClick }) => {
  const { info } = useNotification();
  return <button onClick={() => info("Te asignaron una tarea", undefined, { onClick })}>avisar</button>;
};

describe("NotificationProvider: toast clicable", () => {
  it("al hacer clic ejecuta la acción y cierra el toast", async () => {
    const onClick = vi.fn();
    render(
      <NotificationProvider>
        <Trigger onClick={onClick} />
      </NotificationProvider>
    );
    fireEvent.click(screen.getByText("avisar"));

    fireEvent.click(await screen.findByRole("button", { name: /te asignaron una tarea\. abrir/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("Te asignaron una tarea")).not.toBeInTheDocument());
  });

  it("sin acción el toast no es un botón", async () => {
    render(
      <NotificationProvider>
        <Trigger />
      </NotificationProvider>
    );
    fireEvent.click(screen.getByText("avisar"));

    expect(await screen.findByText("Te asignaron una tarea")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /abrir/i })).not.toBeInTheDocument();
  });
});
