# Guild Marketing OS Audience Segmentation

Guild package: `guild-marketing-os-audience-segmentation`
Package owner: `michaelpreuss`

## Purpose

Converts approved ICP strategy into segment definitions, inclusion and exclusion rules, suppression logic, channel applicability, and list-building instructions.

## Guild Usage

Use after approved ICPs exist. Provide the intended channel, available list or CRM fields, consent and geography constraints, suppression rules, freshness limits, and whether the output is for planning or activation review.

## Operating Boundary

Review-only. This agent does not activate CRM lists, ad audiences, enrichment jobs, or email sends.

## Test

From this package directory:

```sh
guild agent test --workspace michaelpreuss/guild-marketing-os --events none --mode json
```
