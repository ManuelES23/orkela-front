import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import NotificationIcon from "./NotificationIcon";

describe("NotificationIcon", () => {
  it.each([
    ["ticket_client_created", "lucide-building-2"],
    ["ticket_routed_to_team", "lucide-users"],
    ["ticket_client_reopened", "lucide-rotate-ccw"],
    ["tipo_desconocido", "lucide-mail"],
  ])("%s usa el ícono %s", (type, iconClass) => {
    const { container } = render(<NotificationIcon type={type} />);
    expect(container.querySelector(`svg.${iconClass}`)).not.toBeNull();
  });
});
