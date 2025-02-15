import draggable from 'vuedraggable'
import { ManagedItems } from '@/modules/ManagedItems'
import ColumnFilter from '@/components/nodes-table/ColumnFilter.vue'
import ExpandedNode from '@/components/nodes-table/ExpandedNode.vue'
import { mapGetters } from 'vuex'
import SvgIcon from '@jamescoyle/vue-icon'
import {
	mdiBatteryAlertVariantOutline,
	mdiBattery20,
	mdiBattery50,
	mdiBattery80,
	mdiBattery,
	mdiPowerPlug,
} from '@mdi/js'

export default {
	props: {
		nodeActions: Array,
		socket: Object,
	},
	components: {
		draggable,
		ColumnFilter,
		ExpandedNode,
		SvgIcon,
	},
	watch: {},
	computed: {
		...mapGetters(['nodes']),
	},
	data: function () {
		return {
			managedNodes: null,
			nodesProps: {
				/* The node property definition map entries can have the following attributes:
           - type (string): The type of the property
           - label (string): The label of the property to be displayed as table column
           - groupable (boolean): If the column values can be grouped
           - customValue (function): Function to dynamically extract the value from a given node if it is not directly accessible using the key of the definition.
             NOTE: Currently does not work with value grouping due to a limitation of VDataTable
           - customInfo (function): Function to provide more detailed information for displaying as a tooltip
           - customFormat (function): Function to format the value for displaying
        */
				id: { type: 'number', label: 'ID', groupable: false },
				batteryLevel: {
					type: 'number',
					label: 'Power',
					customValue: (node) => this.getBatteryLevel(node),
					customFormat: (value) => (value ? value + '%' : 'mains'),
					customInfo: (node) =>
						node.batteryLevel
							? 'Battery level: ' + node.batteryLevel + '%'
							: 'mains-powered',
					customSort: (items, sortBy, sortDesc, nodeA, nodeB) => {
						// Special sort for power column
						// Use 100% as fallback (for mains-powered devices)
						let levelA = this.getBatteryLevel(nodeA, 101)
						let levelB = this.getBatteryLevel(nodeB, 101)
						let res = levelA < levelB ? -1 : levelA > levelB ? 1 : 0
						res = sortDesc[0] ? -res : res
						return res
					},
				},
				manufacturer: { type: 'string', label: 'Manufacturer' },
				productDescription: { type: 'string', label: 'Product' },
				productLabel: { type: 'string', label: 'Product code' },
				name: { type: 'string', label: 'Name' },
				loc: { type: 'string', label: 'Location' },
				security: { type: 'string', label: 'Security' },
				supportsBeaming: { type: 'boolean', label: 'Beaming' },
				zwavePlusVersion: {
					type: 'string',
					label: 'Z-Wave+',
				},
				firmwareVersion: {
					type: 'string',
					label: 'FW',
				},
				failed: { type: 'boolean', label: 'Failed' },
				status: { type: 'string', label: 'Status' },
				healProgress: { type: 'string', label: 'Heal' },
				interviewStage: { type: 'string', label: 'Interview' },
				lastActive: {
					type: 'date',
					label: 'Last Active',
					groupable: false,
				},
			},
			expanded: [],
			headersMenu: false,
		}
	},
	methods: {
		toggleExpanded(item) {
			this.expanded = this.expanded.includes(item)
				? this.expanded.filter((i) => i !== item)
				: [...this.expanded, item]
		},
		getHealIcon(status) {
			switch (status) {
				case 'done':
					return { icon: 'done', color: 'green' }
				case 'failed':
					return { icon: 'error', color: 'red' }
				case 'skipped':
					return { icon: 'next_plan', color: 'blue' }
			}

			return undefined
		},
		getGroupByLabel(group) {
			let formattedGroup = group
			if (
				this.managedNodes &&
				this.managedNodes.groupBy &&
				this.managedNodes.groupBy[0] &&
				this.nodesProps[this.managedNodes.groupBy[0]] &&
				typeof this.nodesProps[this.managedNodes.groupBy[0]]
					.customFormat === 'function'
			) {
				formattedGroup =
					this.nodesProps[this.managedNodes.groupBy[0]].customFormat(
						group
					)
			}
			return this.managedNodes.groupByTitle + ': ' + formattedGroup
		},
		customSort(items, sortBy, sortDesc) {
			// See https://stackoverflow.com/a/54612408
			if (!sortBy[0]) {
				return items
			}
			items.sort((a, b) => {
				let prop = sortBy[0]
				if (
					this.nodesProps[sortBy[0]] &&
					typeof this.nodesProps[sortBy[0]].customSort === 'function'
				) {
					// Use special sort function if one is defined for the sortBy column
					return this.nodesProps[sortBy[0]].customSort(
						items,
						sortBy,
						sortDesc,
						a,
						b
					)
				} else {
					// Standard sort for every other column
					let res = a[prop] < b[prop] ? -1 : a[prop] > b[prop] ? 1 : 0
					res = sortDesc[0] ? -res : res
					return res
				}
			})
			return items
		},
		getBatteryLevel(node, fallback) {
			return node.batteryLevel !== undefined
				? node.batteryLevel
				: fallback
		},
		getPowerInfo(node) {
			let level = node.batteryLevel
			let style = 'color: green'
			let icon
			let label =
				typeof this.nodesProps.batteryLevel.customFormat === 'function'
					? this.nodesProps.batteryLevel.customFormat(level)
					: level
			let tooltip =
				typeof this.nodesProps.batteryLevel.customInfo === 'function'
					? this.nodesProps.batteryLevel.customInfo(node)
					: ''
			if (level === undefined) {
				icon = mdiPowerPlug
				tooltip = 'mains-powered'
			} else if (level <= 10) {
				icon = mdiBatteryAlertVariantOutline
				style = 'color: red'
			} else if (level <= 30) {
				icon = mdiBattery20
				style = 'color: orange'
			} else if (level <= 70) {
				icon = mdiBattery50
			} else if (level <= 90) {
				icon = mdiBattery80
			} else {
				icon = mdiBattery
			}
			return {
				icon: icon,
				level: level,
				style: style,
				label: label,
				tooltip: tooltip,
			}
		},
	},
	mounted() {
		this.managedNodes = new ManagedItems(
			this.nodes,
			this.nodesProps,
			localStorage,
			'nodes_'
		)
	},
}
