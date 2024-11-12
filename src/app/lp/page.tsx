'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Star } from 'lucide-react'

export default function Component() {
  return (
    <div className="bg-gradient-to-br from-black via-gray-900 to-indigo-950 text-white font-sans min-h-screen">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center p-6 relative overflow-hidden max-w-7xl mx-auto">
        <div className="absolute inset-0 bg-[url('/images/visualizemov.mov?height=1080&width=1920')] bg-cover bg-center opacity-10 z-0"></div>
        <motion.h1 
          className="text-4xl md:text-6xl font-bold mb-4 text-center text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          内省深化と成長加速
        </motion.h1>
        <motion.p 
          className="text-lg md:text-xl mb-8 text-center text-gray-300 max-w-2xl font-light"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          グラフデータベースとAIのサポート<br/>思考を研ぎ澄ますAIメモアプリ
        </motion.p>
        <motion.div 
          className="mb-12 w-64 md:w-96"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <video 
            src="/images/visualizemov.mov?height=540&width=960"
            className="w-full h-auto rounded-2xl shadow-lg"
            autoPlay 
            loop 
            muted 
            playsInline
          />
        </motion.div>
        <div className="flex gap-4 flex-wrap justify-center z-10">
          <motion.a 
            href="https://b-archive.vercel.app/"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-10 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Webではじめる
          </motion.a>
          <motion.a
            href="https://apps.apple.com/jp/app/memoryai-%E5%AD%A6%E3%81%B3%E3%81%AE%E3%83%A1%E3%83%A2%E5%B8%B3/id6738000912"
            className="bg-gradient-to-r from-gray-200 to-gray-100 text-gray-800 px-6 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            iOSではじめる
          </motion.a>
          <motion.a 
            href="https://b-archive.vercel.app/"
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Android(準備中)
          </motion.a>
        </div>
      </section>

      {/* Challenge Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold mb-8 text-center text-white">日々の学びはあなたの中に蓄積していますか？</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {['毎日を振り返る時間がない', '何となくしか成長している気がしない', '過去の経験が次に活きていない'].map((challenge, index) => (
            <motion.div 
              key={index}
              className="bg-gray-900 bg-opacity-70 p-6 rounded-lg backdrop-blur-sm"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <p className="text-lg font-medium">{challenge}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold mb-12 text-center text-white">主要機能</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: 'シンプルなメモ機能', description: '思考をすばやくキャプチャ', image: '/images/1memo.png?height=400&width=400' },
            { title: 'AIとの対話機能', description: '内省を深め、新たな気づきを促進', image: 'images/2AItalk.png?height=400&width=400' },
            { title: '思考の視覚化', description: 'アイデアをリンクし、新たな発見を', image: 'images/3visualize.png?height=400&width=400' }
          ].map((feature, index) => (
            <motion.div 
              key={index}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <div className="aspect-square w-full max-w-md mb-6 relative rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src={feature.image} 
                  alt={feature.title} 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold mb-2 text-center text-blue-300">{feature.title}</h3>
              <p className="text-gray-300 text-center font-light">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold mb-12 text-center text-white">ユーザーの声</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: 'Aさん', comment: '毎日の振り返りが習慣化し、自己成長を実感できるようになりました。' },
            { name: 'Dさん', comment: 'アイデアの繋がりが可視化され、日々の学びの振り返りの負荷が激減' },
            { name: 'Hさん', comment: 'AIとの対話で、自分では気づかなかった視点を得られ、思考が深まりました。' }
          ].map((testimonial, index) => (
            <motion.div 
              key={index}
              className="bg-gray-900 bg-opacity-70 p-8 rounded-lg backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <p className="mb-4 text-lg italic">&ldquo;{testimonial.comment}&rdquo;</p>
              <p className="text-right text-gray-400 font-medium">- {testimonial.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-gradient-to-r from-gray-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold mb-12 text-center text-white">数値で見る効果</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { label: '週間振り返り実施率', value: '85%' },
              { label: '新しい気づきの発見数', value: '週平均7個' },
              { label: 'ユーザー満足度', value: '4.2/5.0' }
            ].map((stat, index) => (
              <motion.div 
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
              >
                <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-sm md:text-base font-light">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 text-center max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold mb-8 text-white">あなたの成長を加速させましょう</h2>
        <p className="mb-8 text-lg font-light">ベータ版無料開放中</p>
        <div className="flex gap-4 flex-wrap justify-center">
        <motion.a 
            href="https://b-archive.vercel.app/"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-10 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Webではじめる
          </motion.a>
          <motion.a
            href="https://apps.apple.com/jp/app/memoryai-%E5%AD%A6%E3%81%B3%E3%81%AE%E3%83%A1%E3%83%A2%E5%B8%B3/id6738000912"
            className="bg-gradient-to-r from-gray-200 to-gray-100 text-gray-800 px-6 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            iOSではじめる
          </motion.a>
          <motion.a 
            href="https://b-archive.vercel.app/"
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Android(準備中)
          </motion.a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-gray-400 text-sm font-light">
        <p>&copy; 2024 Reflection Memo App. All rights reserved.</p>
      </footer>
    </div>
  )
}