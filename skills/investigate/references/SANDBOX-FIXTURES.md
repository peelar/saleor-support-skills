# Sandbox Fixtures

Use these fixture patterns when a Saleor API issue needs a controlled sandbox checkout. Keep every generated GraphQL file under the active case directory so the reproduction remains auditable.

## Workflow

1. Discover reusable IDs: channels, product types, categories, shipping zones, and existing shipping methods.
2. Create the minimum product/variant/listing needed for the behavior.
3. Create a checkout with only the required lines/address/method state.
4. Create or list the voucher/promotion only when the case requires it.
5. Run the smallest mutation that tests the behavior.
6. Cite the saved response and summary artifacts in `FINDINGS.md` or `REPORT.md`.

## Templates

Create files with descriptive kebab-case names under:

```text
.saleor-investigate/cases/<case-id>/sandbox/queries/
.saleor-investigate/cases/<case-id>/sandbox/mutations/
```

Recommended sequence names:

- `sandbox-setup-discovery.graphql`
- `create-fixture-product.graphql`
- `create-fixture-variant.graphql`
- `publish-fixture-product.graphql`
- `create-fixture-checkout.graphql`
- `assign-fixture-shipping-method.graphql`
- `create-fixture-voucher.graphql`
- `apply-fixture-voucher.graphql`
- `remove-fixture-voucher.graphql`

Sandbox mutations execute with:

```bash
<CLI> sandbox mutation run .saleor-investigate/cases/<case-id>/sandbox/mutations/<file>.graphql
```

Prod/live mutations are never executed. Use prod mutation files only as inspection drafts.
