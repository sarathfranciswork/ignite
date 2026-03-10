import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampaignWizard } from "@/components/campaigns/CampaignWizard";

// Mock TipTap editor
jest.mock("@tiptap/react", () => ({
  useEditor: () => null,
  EditorContent: () => <div data-testid="tiptap-editor">Editor</div>,
}));

describe("CampaignWizard", () => {
  it("renders the wizard with sidebar and step 1 by default", () => {
    render(<CampaignWizard />);

    expect(screen.getByText("Campaign Setup")).toBeInTheDocument();
    expect(screen.getAllByText("Description").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Submission Form").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Idea Coach")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();

    // Step 1 content should be visible
    expect(screen.getByLabelText(/campaign title/i)).toBeInTheDocument();
  });

  it("shows steps 3-5 as locked", () => {
    render(<CampaignWizard />);

    const lockedLabels = screen.getAllByText("Locked");
    expect(lockedLabels).toHaveLength(3);
  });

  it("navigates to step 2 when Next is clicked", async () => {
    const user = userEvent.setup();
    render(<CampaignWizard />);

    // Fill required field
    const titleInput = screen.getByLabelText(/campaign title/i);
    await user.type(titleInput, "Test Campaign");

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    // Step 2 content should be visible
    expect(screen.getByLabelText(/campaign guidance/i)).toBeInTheDocument();
  });

  it("shows Back button disabled on step 1", () => {
    render(<CampaignWizard />);

    const backButton = screen.getByRole("button", { name: /back/i });
    expect(backButton).toBeDisabled();
  });

  it("renders all Step 1 form fields", () => {
    render(<CampaignWizard />);

    expect(screen.getByLabelText(/campaign title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/submission close date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/voting close date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teaser/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/video url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/call to action text/i)).toBeInTheDocument();
  });

  it("shows character count for teaser field", async () => {
    const user = userEvent.setup();
    render(<CampaignWizard />);

    const teaserInput = screen.getByLabelText(/teaser/i);
    await user.type(teaserInput, "Hello");

    expect(screen.getByText("5/160")).toBeInTheDocument();
  });

  it("toggles support section on checkbox click", async () => {
    const user = userEvent.setup();
    render(<CampaignWizard />);

    expect(screen.queryByLabelText(/contact name/i)).not.toBeInTheDocument();

    const supportCheckbox = screen.getByLabelText(/enable support section/i);
    await user.click(supportCheckbox);

    expect(screen.getByLabelText(/contact name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
  });
});

describe("CampaignWizard - Step 2", () => {
  async function navigateToStep2() {
    const user = userEvent.setup();
    render(<CampaignWizard />);

    const titleInput = screen.getByLabelText(/campaign title/i);
    await user.type(titleInput, "Test Campaign");

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    return user;
  }

  it("shows empty state when no custom fields", async () => {
    await navigateToStep2();

    expect(screen.getByText(/no custom fields yet/i)).toBeInTheDocument();
  });

  it("adds a custom field when Add Field is clicked", async () => {
    const user = await navigateToStep2();

    const addButton = screen.getByRole("button", { name: /add field/i });
    await user.click(addButton);

    expect(screen.getByText("Untitled field")).toBeInTheDocument();
  });

  it("removes a custom field when remove button is clicked", async () => {
    const user = await navigateToStep2();

    const addButton = screen.getByRole("button", { name: /add field/i });
    await user.click(addButton);

    expect(screen.getByText("Untitled field")).toBeInTheDocument();

    const removeButton = screen.getByRole("button", {
      name: /remove field/i,
    });
    await user.click(removeButton);

    expect(screen.getByText(/no custom fields yet/i)).toBeInTheDocument();
  });

  it("shows form preview when fields are added", async () => {
    const user = await navigateToStep2();

    const addButton = screen.getByRole("button", { name: /add field/i });
    await user.click(addButton);

    expect(screen.getByText("Submission Form Preview")).toBeInTheDocument();
  });
});
