'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { createClient } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2, Move } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Slider
} from '@/components/ui/slider'
import { EditMemoDialog } from '@/components/EditMemoDialog'

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// D3のSimulationNodeDatumを拡張
interface MemoNode extends d3.SimulationNodeDatum {
  id: string
  title: string
  content: string
  importance: number
  created_at: string
  category_id: string
  categories: {
    id: string
    name: string
  }
  relatedMemos: string[]
  x?: number
  y?: number
}

interface Category {
  id: string
  name: string
}

interface LinkDatum extends d3.SimulationLinkDatum<MemoNode> {
  source: string | MemoNode
  target: string | MemoNode
}

export default function MemoVisualization() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<MemoNode | null>(null)
  const [memos, setMemos] = useState<MemoNode[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [nodeDistance, setNodeDistance] = useState<number>(100)
  const [isLoading, setIsLoading] = useState(true)
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown>>()
  const containerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined>>()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name')
          .order('name')

        if (categoriesError) throw categoriesError
        setCategories(categoriesData || [])

        const { data: memosData, error: memosError } = await supabase
          .from('memories')
          .select(`
            id,
            title,
            content,
            importance,
            created_at,
            category_id,
            categories (
              id,
              name
            )
          `)
          .order('created_at', { ascending: false })

        if (memosError) throw memosError

        const { data: relationsData, error: relationsError } = await supabase
          .from('memory_relations')
          .select('source_memo_id, target_memo_id')

        if (relationsError) throw relationsError

        const memosWithRelations = memosData.map(memo => {
          const typedMemo: MemoNode = {
            ...memo,
            categories: memo.categories[0], // 配列の最初の要素を取得
            relatedMemos: relationsData
              .filter(rel => rel.source_memo_id === memo.id)
              .map(rel => rel.target_memo_id)
          }
          return typedMemo
        })

        setMemos(memosWithRelations)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleMemoUpdate = async () => {
    try {
      const { data: memosData, error: memosError } = await supabase
        .from('memories')
        .select(`
          id,
          title,
          content,
          importance,
          created_at,
          category_id,
          categories (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (memosError) throw memosError

      const { data: relationsData, error: relationsError } = await supabase
        .from('memory_relations')
        .select('source_memo_id, target_memo_id')

      if (relationsError) throw relationsError

      const updatedMemosWithRelations = memosData.map(memo => {
        const typedMemo: MemoNode = {
          ...memo,
          categories: memo.categories[0], // 配列の最初の要素を取得
          relatedMemos: relationsData
            .filter(rel => rel.source_memo_id === memo.id)
            .map(rel => rel.target_memo_id)
        }
        return typedMemo
      })
      

      setMemos(updatedMemosWithRelations)
      return true
    } catch (error) {
      console.error('Error updating memos:', error)
      return false
    }
  }

  const categoryColorScale = d3.scaleOrdinal<string>()
    .domain(categories.map(c => c.id))
    .range(d3.schemePaired)

  useEffect(() => {
    if (!svgRef.current || isLoading || memos.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = window.innerWidth
    const height = window.innerHeight
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g')
    containerRef.current = g

    const filteredMemos = selectedCategory === 'all'
      ? memos
      : memos.filter(memo => memo.category_id === selectedCategory)

    const linkData: LinkDatum[] = filteredMemos.flatMap(memo => 
      memo.relatedMemos
        .filter(relatedId => filteredMemos.some(m => m.id === relatedId))
        .map(relatedId => ({
          source: memo.id,
          target: relatedId
        }))
    )

    const simulation = d3.forceSimulation<MemoNode>(filteredMemos)
      .force('link', d3.forceLink<MemoNode, LinkDatum>(linkData)
        .id(d => d.id)
        .distance(nodeDistance))
      .force('charge', d3.forceManyBody()
        .strength(-120)
        .distanceMax(200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(25))
      .alphaDecay(0.01)

    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(linkData)
      .join('line')
      .attr('stroke', '#666')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5)

    const nodes = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(filteredMemos)
      .join('g')

    nodes.append('circle')
      .attr('r', d => Math.min((d.importance || 1) * 2.5, 15))
      .attr('fill', d => categoryColorScale(d.category_id))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)

    nodes.append('text')
      .text(d => d.title.length > 10 ? d.title.slice(0, 10) + '...' : d.title)
      .attr('dy', -15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#333')
      .attr('pointer-events', 'none')

    const zoom = d3.zoom()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    zoomRef.current = zoom
    svg.call(zoom as any)

    function drag(simulation: d3.Simulation<MemoNode, undefined>) {
      function dragstarted(event: d3.D3DragEvent<Element, MemoNode, MemoNode>) {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
      }
      
      function dragged(event: d3.D3DragEvent<Element, MemoNode, MemoNode>) {
        event.subject.fx = event.x
        event.subject.fy = event.y
      }
      
      function dragended(event: d3.D3DragEvent<Element, MemoNode, MemoNode>) {
        if (!event.active) simulation.alphaTarget(0)
        event.subject.fx = null
        event.subject.fy = null
      }
      
      return d3.drag<Element, MemoNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
    }

    nodes.call(drag(simulation) as any)

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as MemoNode).x || 0)
        .attr('y1', d => (d.source as MemoNode).y || 0)
        .attr('x2', d => (d.target as MemoNode).x || 0)
        .attr('y2', d => (d.target as MemoNode).y || 0)

      nodes.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`)
    })

    nodes.on('click', (event: MouseEvent, d: MemoNode) => {
      event.stopPropagation()
      setSelectedNode(d)
      const relatedNodes = filteredMemos.filter(memo => 
        d.relatedMemos.includes(memo.id) || memo.id === d.id
      )
      nodes.attr('opacity', 0.2)
      link.attr('opacity', 0.1)
      
      d3.selectAll(relatedNodes.map(n => 
        nodes.filter((d: MemoNode) => d.id === n.id).nodes()
      ).flat()).attr('opacity', 1)
      
      d3.selectAll(relatedNodes.map(n => 
        link.filter((l: LinkDatum) => 
          (l.source as MemoNode).id === n.id || (l.target as MemoNode).id === n.id
        ).nodes()
      ).flat()).attr('opacity', 1)
    })

    svg.on('click', (event) => {
      if (event.target === svg.node()) {
        setSelectedNode(null)
        nodes.attr('opacity', 1)
        link.attr('opacity', 1)
      }
    })

    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      svg.attr('width', width).attr('height', height)
      simulation.force('center', d3.forceCenter(width / 2, height / 2))
      simulation.alpha(1).restart()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      simulation.stop()
    }
  }, [memos, isLoading, selectedCategory, nodeDistance, categories])

  const handleFitView = () => {
    if (!svgRef.current || !containerRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    const g = containerRef.current
    const zoom = zoomRef.current
    const bounds = (g.node() as SVGGElement).getBBox()
    const width = parseInt(svg.attr('width'))
    const height = parseInt(svg.attr('height'))
    const scale = 0.9 / Math.max(bounds.width / width, bounds.height / height)
    const translateX = (width - scale * (bounds.x * 2 + bounds.width)) / 2
    const translateY = (height - scale * (bounds.y * 2 + bounds.height)) / 2

    svg.transition()
      .duration(750)
      .call(zoom.transform as any, d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale))
  }

  return (
    <div className="w-full h-screen relative">
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 bg-white/90 p-2 rounded-lg shadow-lg">
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" size="icon" onClick={handleFitView}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Move className="h-4 w-4" />
          <div className="flex-grow">
            <Slider
              value={[nodeDistance]}
              onValueChange={([value]) => setNodeDistance(value)}
              min={50}
              max={200}
              step={10}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <svg ref={svgRef} className="w-full h-full bg-gray-50"></svg>

      {/* モバイル向け詳細表示 */}
      {selectedNode && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 p-4 shadow-lg rounded-t-lg max-h-[50vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-lg font-bold">{selectedNode.title}</h2>
              <p className="text-xs text-gray-600">
                {new Date(selectedNode.created_at).toLocaleString()}
              </p>
              <p className="text-xs" style={{ color: categoryColorScale(selectedNode.category_id) }}>
                {selectedNode.categories?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <p className="text-xs bg-blue-100 px-2 py-1 rounded">
                Importance: {selectedNode.importance}
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
              >
                Edit
              </Button>
            </div>
          </div>
          <p className="text-sm">{selectedNode.content}</p>
        </div>
      )}

      <EditMemoDialog
        memo={selectedNode}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={async () => {
          const result = await handleMemoUpdate()
          if (result) setIsEditDialogOpen(false)
        }}
        supabase={supabase}
      />
    </div>
  )
}